import type {
  DiffError,
  DiffResult,
  DiffSchema,
  ParseFileOptions,
  Result,
  Workbook,
} from '../types.js';

/** Main thread → Worker. All fields structured-clone safe. */
export type MessageRequest =
  | {
      readonly type: 'parse';
      readonly correlationId: string;
      /** Ownership transferred via `postMessage(..., [input])`. */
      readonly input: ArrayBuffer;
      readonly options?: ParseFileOptions;
    }
  | {
      readonly type: 'diff';
      readonly correlationId: string;
      /**
       * Workbook is plain objects / dense row arrays — NOT transferable.
       * Structured-clone cost is intentional; only parse inputs use transfer.
       */
      readonly a: Workbook;
      readonly b: Workbook;
      readonly schema: DiffSchema;
    }
  | {
      readonly type: 'cancel';
      /** Cancel this in-flight request if the Worker is still working on it. */
      readonly correlationId: string;
    };

/** Worker → main thread. All fields structured-clone safe. */
export type MessageResponse =
  | {
      readonly type: 'progress';
      readonly correlationId: string;
      /** 0–100 inclusive. */
      readonly pct: number;
    }
  | {
      readonly type: 'result';
      readonly correlationId: string;
      /**
       * Engine outcome (including DiffError codes such as CANCELLED).
       * Narrow by the matching request: Workbook for parse, DiffResult for diff.
       */
      readonly value: Result<Workbook | DiffResult, DiffError>;
    }
  | {
      readonly type: 'error';
      readonly correlationId: string;
      /** Worker-level failure (protocol / unexpected throw), not a DiffError. */
      readonly message: string;
    };
