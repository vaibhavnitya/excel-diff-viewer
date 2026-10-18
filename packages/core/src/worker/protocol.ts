import type { OverlayFnPairsResult } from '../overlay/fn-pairs.js';
import type { SerializableOverlayOptions } from '../overlay/serializable-schema.js';
import type {
  DiffError,
  DiffResult,
  DiffSchema,
  OverlayResult,
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
      readonly type: 'overlay';
      readonly correlationId: string;
      readonly base: Workbook;
      readonly overlay: Workbook;
      /** Fn body stripped; Worker builds pairs for `kind: 'fn'`. */
      readonly options: SerializableOverlayOptions;
    }
  | {
      readonly type: 'cancel';
      /** Cancel this in-flight request if the Worker is still working on it. */
      readonly correlationId: string;
    };

/** Wire-safe fn-pairs payload (no ComposeFn). */
export type OverlayFnPairsWire = Omit<OverlayFnPairsResult, 'schema'> & {
  readonly kind: 'fn-pairs';
};

export type OverlayWorkerValue =
  | { readonly kind: 'result'; readonly value: OverlayResult }
  | OverlayFnPairsWire;

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
       * Narrow by the matching request: Workbook for parse, DiffResult for diff,
       * OverlayWorkerValue for overlay.
       */
      readonly value: Result<
        Workbook | DiffResult | OverlayWorkerValue,
        DiffError
      >;
    }
  | {
      readonly type: 'error';
      readonly correlationId: string;
      /** Worker-level failure (protocol / unexpected throw), not a DiffError. */
      readonly message: string;
    };
