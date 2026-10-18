// Public API. Everything exported here is part of the versioned
// contract — breaking changes require a major version bump.
// Internal helpers are not re-exported; see PRINCIPLES.md section 10.

export type {
  CellComparator,
  CellNormalizer,
  CellValue,
  ComposeFn,
  DiffChange,
  DiffControl,
  DiffError,
  DiffErrorCode,
  DiffResult,
  DiffRow,
  DiffSchema,
  DiffStats,
  DiffStatus,
  DiffWorkbooksOptions,
  FileFormat,
  InferSchemaOptions,
  InvalidSchemaErrorDetails,
  Limits,
  NamedRow,
  NumericTolerance,
  NumericToleranceInput,
  OverlayAmbiguousMatchErrorDetails,
  OverlayError,
  OverlayMeta,
  OverlayResult,
  OverlayRule,
  OverlaySchema,
  OverlaySummary,
  OverlayWorkbooksOptions,
  ParseFileOptions,
  ParseInput,
  Parser,
  Result,
  Row,
  RowKey,
  RowWarning,
  Sheet,
  Workbook,
} from './types.js';

export { createDiffError } from './errors.js';
export { err, isErr, isOk, ok } from './result.js';
export {
  DEFAULT_KEY_CANDIDATES,
  DEFAULT_LIMITS,
  DEFAULT_NUMERIC_TOLERANCE,
} from './defaults.js';

export { parseFile } from './parsers/parse-file.js';
export { inferSchema } from './schema/infer-schema.js';
export { diffWorkbooks, diffWorkbooksAsync } from './diff/diff-workbooks.js';
export {
  overlayWorkbooks,
  overlayWorkbooksAsync,
} from './overlay/overlay.js';

export { createWorker, WorkerClient } from './worker/create-worker.js';
export type { WorkerProgress } from './worker/create-worker.js';
export type {
  MatchedPair,
  OverlayFnPairsResult,
} from './overlay/fn-pairs.js';
export type { OverlayEngineOutcome } from './overlay/overlay.js';
export type { OverlayWorkerValue } from './worker/protocol.js';
export { assembleFnOverlay } from './overlay/fn-pairs.js';
export { finishOverlayResult } from './overlay/build-derived.js';
