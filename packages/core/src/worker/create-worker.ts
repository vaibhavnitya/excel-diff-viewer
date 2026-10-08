import { createDiffError } from '../errors.js';
import { err, ok } from '../result.js';
import type {
  DiffError,
  DiffResult,
  DiffSchema,
  ParseFileOptions,
  ParseInput,
  Result,
  Workbook,
} from '../types.js';
import type { MessageRequest, MessageResponse } from './protocol.js';
import { WORKER_SOURCE } from './worker-source.js';

export type WorkerProgress = {
  readonly correlationId: string;
  readonly pct: number;
};

type Pending = {
  readonly correlationId: string;
  readonly resolve: (value: Result<unknown, DiffError>) => void;
};

function toArrayBuffer(input: ParseInput): ArrayBuffer {
  if (input instanceof ArrayBuffer) {
    return input;
  }
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
}

function createUnderlyingWorker(): { worker: Worker; blobUrl: string | null } {
  if (typeof Worker === 'undefined') {
    throw createDiffError(
      'WORKER_UNAVAILABLE',
      'Web Workers are not available in this environment.',
    );
  }

  // Primary: co-located worker resolved via import.meta.url.
  // - Published `dist/index.js` loads sibling `worker.js` (tsup Worker entry).
  // - Vitest/Vite against `src/` loads `worker.ts` so the browser project works
  //   without a pre-build.
  const workerModule =
    import.meta.url.includes('/src/') || import.meta.url.includes('\\src\\')
      ? './worker.ts'
      : './worker.js';

  try {
    const worker = new Worker(new URL(workerModule, import.meta.url), {
      type: 'module',
    });
    return { worker, blobUrl: null };
  } catch (cause) {
    // Only construction-time SyntaxError / ReferenceError trigger fallback
    // (e.g. environments that cannot resolve import.meta.url Worker URLs).
    // Other failures (security, network) propagate as WORKER_UNAVAILABLE.
    const isFallbackCase =
      cause instanceof SyntaxError || cause instanceof ReferenceError;
    if (!isFallbackCase) {
      throw createDiffError(
        'WORKER_UNAVAILABLE',
        'Failed to construct Worker from import.meta.url.',
        { cause: String(cause) },
      );
    }
  }

  // Fallback: inline Blob URL carrying the Worker bundle as a string.
  // Trade-off: loses source maps; may bloat the initial main-thread bundle
  // because WORKER_SOURCE embeds the full self-contained worker.js text.
  if (WORKER_SOURCE.length === 0) {
    throw createDiffError(
      'WORKER_UNAVAILABLE',
      'Blob URL Worker fallback has no embedded worker source.',
    );
  }

  const blob = new Blob([WORKER_SOURCE], { type: 'text/javascript' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    const worker = new Worker(blobUrl, { type: 'module' });
    return { worker, blobUrl };
  } catch (cause) {
    URL.revokeObjectURL(blobUrl);
    throw createDiffError(
      'WORKER_UNAVAILABLE',
      'Failed to construct Worker from Blob URL fallback.',
      { cause: String(cause) },
    );
  }
}

/**
 * Single-flight Worker client: latest parse/diff wins.
 *
 * A new `parse()` / `diff()` call cancels any in-flight request on this client
 * with `CANCELLED`, then starts the new one. For concurrent work, call
 * `createWorker()` more than once (one client per in-flight operation).
 */
export class WorkerClient {
  private worker: Worker | null;
  private blobUrl: string | null;
  private current: Pending | null;
  private nextId: number;
  private readonly progressListeners: Set<(progress: WorkerProgress) => void>;
  private terminated: boolean;

  constructor() {
    this.current = null;
    this.nextId = 0;
    this.progressListeners = new Set();
    this.terminated = false;
    const created = createUnderlyingWorker();
    this.worker = created.worker;
    this.blobUrl = created.blobUrl;
    this.worker.addEventListener('message', this.handleMessage);
    this.worker.addEventListener('error', this.handleWorkerError);
    this.worker.addEventListener('messageerror', this.handleMessageError);
  }

  parse(
    input: ParseInput,
    options?: ParseFileOptions,
  ): Promise<Result<Workbook, DiffError>> {
    const ready = this.ensureNotTerminated();
    if (!ready.ok) {
      return Promise.resolve(ready);
    }

    this.cancelInFlight();

    const correlationId = this.allocateCorrelationId();
    const buffer = toArrayBuffer(input);
    const request: MessageRequest = {
      type: 'parse',
      correlationId,
      input: buffer,
      options,
    };

    return this.enqueue(correlationId, () => {
      this.postRequest(request, [buffer]);
    }) as Promise<Result<Workbook, DiffError>>;
  }

  diff(
    a: Workbook,
    b: Workbook,
    schema: DiffSchema,
  ): Promise<Result<DiffResult, DiffError>> {
    const ready = this.ensureNotTerminated();
    if (!ready.ok) {
      return Promise.resolve(ready);
    }

    this.cancelInFlight();

    const correlationId = this.allocateCorrelationId();
    // Workbook payloads are structured-cloned (not transferable) — intentional cost.
    const request: MessageRequest = {
      type: 'diff',
      correlationId,
      a,
      b,
      schema,
    };

    return this.enqueue(correlationId, () => {
      this.postRequest(request);
    }) as Promise<Result<DiffResult, DiffError>>;
  }

  /**
   * Cancel one in-flight request by id, or the current in-flight request when
   * `correlationId` is omitted.
   */
  cancel(correlationId?: string): void {
    if (this.terminated || this.current === null) {
      return;
    }
    if (correlationId !== undefined && this.current.correlationId !== correlationId) {
      return;
    }
    this.cancelInFlight();
  }

  /** Destroy the Worker; idempotent. In-flight work resolves as CANCELLED. */
  terminate(): void {
    if (this.terminated) {
      return;
    }
    this.terminated = true;
    this.cancelInFlight();
    if (this.worker !== null) {
      this.worker.removeEventListener('message', this.handleMessage);
      this.worker.removeEventListener('error', this.handleWorkerError);
      this.worker.removeEventListener('messageerror', this.handleMessageError);
      this.worker.terminate();
      this.worker = null;
    }
    if (this.blobUrl !== null) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
  }

  /** Subscribe to progress; returns unsubscribe. */
  onProgress(callback: (progress: WorkerProgress) => void): () => void {
    this.progressListeners.add(callback);
    return () => {
      this.progressListeners.delete(callback);
    };
  }

  private enqueue(
    correlationId: string,
    send: () => void,
  ): Promise<Result<unknown, DiffError>> {
    return new Promise((resolve) => {
      this.current = { correlationId, resolve };
      try {
        send();
      } catch (cause) {
        this.current = null;
        resolve(
          err(
            createDiffError(
              'WORKER_UNAVAILABLE',
              'Failed to post message to Worker.',
              { cause: String(cause) },
            ),
          ),
        );
      }
    });
  }

  private cancelInFlight(): void {
    const pending = this.current;
    if (pending === null) {
      return;
    }
    this.current = null;
    this.postRequest({ type: 'cancel', correlationId: pending.correlationId });
    pending.resolve(
      err(createDiffError('CANCELLED', 'Request was cancelled.', { correlationId: pending.correlationId })),
    );
  }

  private postRequest(request: MessageRequest, transfer?: Transferable[]): void {
    if (this.worker === null) {
      return;
    }
    if (transfer !== undefined && transfer.length > 0) {
      this.worker.postMessage(request, transfer);
    } else {
      this.worker.postMessage(request);
    }
  }

  private readonly handleMessage = (event: MessageEvent<MessageResponse>): void => {
    const message = event.data;
    if (message == null || typeof message !== 'object' || !('type' in message)) {
      return;
    }

    if (message.type === 'progress') {
      // Ignore progress from a superseded / cancelled request.
      if (this.current?.correlationId !== message.correlationId) {
        return;
      }
      const progress: WorkerProgress = {
        correlationId: message.correlationId,
        pct: message.pct,
      };
      for (const listener of this.progressListeners) {
        listener(progress);
      }
      return;
    }

    const pending = this.current;
    if (pending === null || pending.correlationId !== message.correlationId) {
      // Stale response after cancel / supersede — ignore.
      return;
    }

    this.current = null;

    if (message.type === 'result') {
      pending.resolve(message.value);
      return;
    }

    if (message.type === 'error') {
      pending.resolve(
        err(
          createDiffError('WORKER_CRASHED', message.message, {
            correlationId: message.correlationId,
          }),
        ),
      );
    }
  };

  private readonly handleWorkerError = (_event: ErrorEvent): void => {
    this.failAllWithCrash('Worker threw an unhandled error.');
  };

  private readonly handleMessageError = (_event: MessageEvent): void => {
    this.failAllWithCrash('Worker failed to deserialize a message.');
  };

  private failAllWithCrash(message: string): void {
    const pending = this.current;
    this.current = null;
    if (pending !== null) {
      pending.resolve(err(createDiffError('WORKER_CRASHED', message)));
    }
    // Enter terminated state; caller must createWorker() again.
    if (!this.terminated) {
      this.terminated = true;
      if (this.worker !== null) {
        this.worker.removeEventListener('message', this.handleMessage);
        this.worker.removeEventListener('error', this.handleWorkerError);
        this.worker.removeEventListener('messageerror', this.handleMessageError);
        this.worker.terminate();
        this.worker = null;
      }
      if (this.blobUrl !== null) {
        URL.revokeObjectURL(this.blobUrl);
        this.blobUrl = null;
      }
    }
  }

  private ensureNotTerminated(): Result<void, DiffError> {
    if (this.terminated || this.worker === null) {
      return err(
        createDiffError(
          'WORKER_CRASHED',
          'WorkerClient has been terminated. Call createWorker() for a new instance.',
        ),
      );
    }
    return ok(undefined);
  }

  private allocateCorrelationId(): string {
    this.nextId += 1;
    return `c-${this.nextId}`;
  }
}

/**
 * Spin up one Worker-backed client.
 * @throws never — construction failures surface as DiffError on first call,
 *   except Worker construction which throws DiffError synchronously so
 *   callers can catch WORKER_UNAVAILABLE immediately.
 */
export function createWorker(): WorkerClient {
  return new WorkerClient();
}
