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

/**
 * Construct a Worker from an embedded Blob URL.
 *
 * Blob URLs work across bundlers (Next.js, Vite, CRA, Remix, plain HTML).
 * Native `new Worker(new URL(..., import.meta.url))` is bundler-dependent and
 * often resolves to an unusable `file://` URL inside Next.js output — so Blob
 * is the sole path. The Worker source is embedded in the main bundle at build
 * time (`__EMBEDDED_WORKER__`); main-bundle size is a Phase 6 concern.
 */
function createUnderlyingWorker(): Worker {
  if (typeof Worker === 'undefined') {
    throw createDiffError(
      'WORKER_UNAVAILABLE',
      'Web Workers are not available in this environment.',
    );
  }

  if (WORKER_SOURCE.length === 0) {
    throw createDiffError(
      'WORKER_UNAVAILABLE',
      'Embedded Worker source is empty; rebuild @your-scope/excel-diff-core.',
    );
  }

  const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    return new Worker(blobUrl);
  } catch (cause) {
    throw createDiffError(
      'WORKER_UNAVAILABLE',
      'Failed to construct Worker from Blob URL.',
      { cause: String(cause) },
    );
  } finally {
    // Script bytes are already handed to the Worker; free the Blob URL.
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * Single-flight Worker client: latest parse/diff wins.
 *
 * A new `parse()` / `diff()` call cancels any in-flight request on this client
 * with `CANCELLED`, then starts the new one. For concurrent work, call
 * `createWorker()` more than once (one client per in-flight operation).
 *
 * @example
 * ```ts
 * import { createWorker, inferSchema } from '@your-scope/excel-diff-core';
 *
 * const client = createWorker();
 * const a = await client.parse(bytesA, { filename: 'v1.xlsx' });
 * const b = await client.parse(bytesB, { filename: 'v2.xlsx' });
 * if (!a.ok || !b.ok) throw new Error('parse failed');
 * const inferred = inferSchema(a.value.sheets[0].headers);
 * if (!inferred.ok) throw new Error(inferred.error.message);
 * // WorkerClient.diff takes schema directly (wraps `{ schema }` for the engine).
 * const diffed = await client.diff(a.value, b.value, inferred.value);
 * client.terminate();
 * ```
 */
export class WorkerClient {
  private worker: Worker | null;
  private current: Pending | null;
  private nextId: number;
  private readonly progressListeners: Set<(progress: WorkerProgress) => void>;
  private terminated: boolean;

  constructor() {
    this.current = null;
    this.nextId = 0;
    this.progressListeners = new Set();
    this.terminated = false;
    this.worker = createUnderlyingWorker();
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
 *
 * Construction throws a `DiffError` value (not an `Error` instance) with code
 * `WORKER_UNAVAILABLE` when Workers cannot be created.
 *
 * @example
 * ```ts
 * import { createWorker } from '@your-scope/excel-diff-core';
 *
 * const client = createWorker();
 * try {
 *   const parsed = await client.parse(bytes, { filename: 'rates.xlsx' });
 * } finally {
 *   client.terminate();
 * }
 * ```
 */
export function createWorker(): WorkerClient {
  return new WorkerClient();
}
