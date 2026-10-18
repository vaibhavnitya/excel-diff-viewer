import {
  createDiffError,
  err,
  ok,
  type DiffError,
  type DiffResult,
  type DiffSchema,
  type OverlayWorkbooksOptions,
  type OverlayWorkerValue,
  type ParseFileOptions,
  type ParseInput,
  type Result,
  type Workbook,
  type WorkerProgress,
} from '@mojro/excel-diff-core';

type Pending = {
  readonly correlationId: string;
  readonly resolve: (value: Result<unknown, DiffError>) => void;
};

export type FakeParseHandler = (
  input: ParseInput,
  options?: ParseFileOptions,
) => Promise<Result<Workbook, DiffError>> | Result<Workbook, DiffError>;

export type FakeDiffHandler = (
  a: Workbook,
  b: Workbook,
  schema: DiffSchema,
) => Promise<Result<DiffResult, DiffError>> | Result<DiffResult, DiffError>;

export type FakeOverlayHandler = (
  base: Workbook,
  overlay: Workbook,
  options: OverlayWorkbooksOptions,
) =>
  | Promise<Result<OverlayWorkerValue, DiffError>>
  | Result<OverlayWorkerValue, DiffError>;

/** Controllable WorkerClient stand-in for hook tests (no real Worker). */
export class FakeWorkerClient {
  static readonly instances: FakeWorkerClient[] = [];

  /** Applied to the next constructed client, then cleared. */
  static nextParseHandler: FakeParseHandler | null = null;
  static nextDiffHandler: FakeDiffHandler | null = null;
  static nextOverlayHandler: FakeOverlayHandler | null = null;
  /** Progress pcts emitted during the next operation on the next client. */
  static nextProgressSequence: number[] | null = null;

  static reset(): void {
    for (const instance of FakeWorkerClient.instances) {
      if (!instance.terminated) {
        instance.terminate();
      }
    }
    FakeWorkerClient.instances.length = 0;
    FakeWorkerClient.nextParseHandler = null;
    FakeWorkerClient.nextDiffHandler = null;
    FakeWorkerClient.nextOverlayHandler = null;
    FakeWorkerClient.nextProgressSequence = null;
  }

  static get liveCount(): number {
    return FakeWorkerClient.instances.filter((c) => !c.terminated).length;
  }

  /** Most recently constructed live client (or last instance). */
  static latest(): FakeWorkerClient | undefined {
    return FakeWorkerClient.instances[FakeWorkerClient.instances.length - 1];
  }

  terminated = false;
  parseCalls = 0;
  diffCalls = 0;
  overlayCalls = 0;
  terminateCalls = 0;
  cancelCalls = 0;

  parseHandler: FakeParseHandler | null = null;
  diffHandler: FakeDiffHandler | null = null;
  overlayHandler: FakeOverlayHandler | null = null;
  progressSequence: number[] = [];

  private current: Pending | null = null;
  private nextId = 0;
  private readonly progressListeners = new Set<(progress: WorkerProgress) => void>();

  private deferResolve: ((value: Result<unknown, DiffError>) => void) | null =
    null;

  constructor() {
    if (FakeWorkerClient.nextParseHandler !== null) {
      this.parseHandler = FakeWorkerClient.nextParseHandler;
      FakeWorkerClient.nextParseHandler = null;
    }
    if (FakeWorkerClient.nextDiffHandler !== null) {
      this.diffHandler = FakeWorkerClient.nextDiffHandler;
      FakeWorkerClient.nextDiffHandler = null;
    }
    if (FakeWorkerClient.nextOverlayHandler !== null) {
      this.overlayHandler = FakeWorkerClient.nextOverlayHandler;
      FakeWorkerClient.nextOverlayHandler = null;
    }
    if (FakeWorkerClient.nextProgressSequence !== null) {
      this.progressSequence = FakeWorkerClient.nextProgressSequence;
      FakeWorkerClient.nextProgressSequence = null;
    }
    FakeWorkerClient.instances.push(this);
  }

  parse(
    input: ParseInput,
    options?: ParseFileOptions,
  ): Promise<Result<Workbook, DiffError>> {
    this.parseCalls += 1;
    return this.enqueue(async (correlationId) => {
      this.emitProgressSequence(correlationId);
      if (this.parseHandler !== null) {
        return this.parseHandler(input, options);
      }
      return ok(defaultWorkbook('parsed.xlsx'));
    }) as Promise<Result<Workbook, DiffError>>;
  }

  diff(
    a: Workbook,
    b: Workbook,
    schema: DiffSchema,
  ): Promise<Result<DiffResult, DiffError>> {
    this.diffCalls += 1;
    return this.enqueue(async (correlationId) => {
      this.emitProgressSequence(correlationId);
      if (this.diffHandler !== null) {
        return this.diffHandler(a, b, schema);
      }
      return ok(defaultDiffResult());
    }) as Promise<Result<DiffResult, DiffError>>;
  }

  overlay(
    base: Workbook,
    overlayWb: Workbook,
    options: OverlayWorkbooksOptions,
  ): Promise<Result<OverlayWorkerValue, DiffError>> {
    this.overlayCalls += 1;
    return this.enqueue(async (correlationId) => {
      this.emitProgressSequence(correlationId);
      if (this.overlayHandler !== null) {
        return this.overlayHandler(base, overlayWb, options);
      }
      return ok(defaultOverlayResult(base));
    }) as Promise<Result<OverlayWorkerValue, DiffError>>;
  }

  cancel(correlationId?: string): void {
    void correlationId;
    this.cancelCalls += 1;
    this.cancelInFlight();
  }

  terminate(): void {
    this.terminateCalls += 1;
    if (this.terminated) {
      return;
    }
    this.terminated = true;
    this.cancelInFlight();
  }

  onProgress(callback: (progress: WorkerProgress) => void): () => void {
    this.progressListeners.add(callback);
    return () => {
      this.progressListeners.delete(callback);
    };
  }

  resolveDeferred(value: Result<unknown, DiffError>): void {
    const resolve = this.deferResolve;
    this.deferResolve = null;
    if (resolve !== null) {
      resolve(value);
    }
  }

  /** Next parse waits until `resolveDeferred` or cancel. */
  armDeferredParse(): void {
    this.parseHandler = () =>
      new Promise<Result<Workbook, DiffError>>((resolve) => {
        this.deferResolve = resolve as (
          value: Result<unknown, DiffError>,
        ) => void;
      });
  }

  emitProgress(pct: number, correlationId?: string): void {
    const id = correlationId ?? this.current?.correlationId ?? 'c-0';
    for (const listener of this.progressListeners) {
      listener({ correlationId: id, pct });
    }
  }

  private emitProgressSequence(correlationId: string): void {
    const sequence = this.progressSequence;
    this.progressSequence = [];
    for (const pct of sequence) {
      this.emitProgress(pct, correlationId);
    }
  }

  private enqueue(
    run: (correlationId: string) => Promise<Result<unknown, DiffError>>,
  ): Promise<Result<unknown, DiffError>> {
    if (this.terminated) {
      return Promise.resolve(
        err(
          createDiffError(
            'WORKER_CRASHED',
            'WorkerClient has been terminated. Call createWorker() for a new instance.',
          ),
        ),
      );
    }

    this.cancelInFlight();
    const correlationId = this.allocateCorrelationId();

    return new Promise((resolve) => {
      this.current = { correlationId, resolve };
      void run(correlationId).then((value) => {
        if (this.current?.correlationId !== correlationId) {
          return;
        }
        this.current = null;
        resolve(value);
      });
    });
  }

  private cancelInFlight(): void {
    const pending = this.current;
    if (pending === null) {
      return;
    }
    this.current = null;
    const cancelled = err(
      createDiffError('CANCELLED', 'Request was cancelled.'),
    );
    if (this.deferResolve !== null) {
      const resolve = this.deferResolve;
      this.deferResolve = null;
      resolve(cancelled);
    }
    pending.resolve(cancelled);
  }

  private allocateCorrelationId(): string {
    this.nextId += 1;
    return `c-${this.nextId}`;
  }
}

export function defaultWorkbook(filename = 'file.xlsx'): Workbook {
  return {
    sheets: [
      {
        name: 'Sheet1',
        headers: ['origin', 'rate'],
        rows: [['us', 1]],
      },
    ],
    activeSheetIndex: 0,
    meta: { format: 'xlsx', filename },
  };
}

export function defaultDiffResult(): DiffResult {
  return {
    headers: ['origin', 'rate'],
    rows: [],
    stats: {
      added: 0,
      removed: 0,
      modified: 0,
      unchanged: 0,
    },
  };
}

export function defaultSchema(): DiffSchema {
  return {
    keyFields: ['origin'],
    valueFields: ['rate'],
  };
}

export function defaultOverlayResult(base?: Workbook): OverlayWorkerValue {
  const workbook = base ?? defaultWorkbook('overlay.csv');
  return {
    kind: 'result',
    value: {
      workbook: {
        ...workbook,
        meta: {
          ...workbook.meta,
          overlay: {
            totalBase: 1,
            totalOverlay: 1,
            matched: 1,
            unmatched: 0,
            droppedByCompose: 0,
            rowWarnings: [],
          },
        },
      },
      summary: {
        totalBase: 1,
        totalOverlay: 1,
        matched: 1,
        unmatched: 0,
        droppedByCompose: 0,
      },
    },
  };
}
