// Public API. Everything exported here is part of the versioned
// contract — breaking changes require a major version bump.
// Internal helpers are not re-exported; see PRINCIPLES.md section 10.

export type {
  BooleanColumnSummary,
  CategoricalChangeAggregate,
  CategoricalColumnSummary,
  CellComparator,
  CellNormalizer,
  CellValue,
  ColumnSummary,
  ColumnTreatment,
  ComposeFn,
  DateColumnSummary,
  DiffChange,
  DiffControl,
  DiffError,
  DiffErrorCode,
  DiffResult,
  DiffRow,
  DiffSchema,
  DiffStats,
  DiffStatus,
  DiffSummary,
  DiffWorkbooksOptions,
  FieldChangeAggregate,
  FileFormat,
  InferSchemaOptions,
  InvalidSchemaErrorDetails,
  Limits,
  NamedRow,
  NumericChangeAggregate,
  NumericColumnSummary,
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
  SkippedColumn,
  SummaryCache,
  SummaryConfig,
  SummaryError,
  SummaryWarning,
  Workbook,
  WorkbookSummary,
  WriteError,
  WriteWorkbookOptions,
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
export {
  createSummaryCache,
  summarizeWorkbook,
  summarizeWorkbookAsync,
} from './summary/summarize.js';
export { writeWorkbook, writeWorkbookAsync } from './write/write.js';

export { createWorker, WorkerClient } from './worker/create-worker.js';
export type { WorkerProgress } from './worker/create-worker.js';
export type {
  MatchedPair,
  OverlayFnPairsResult,
} from './overlay/fn-pairs.js';
export type { OverlayEngineOutcome } from './overlay/overlay.js';
export type { OverlayWorkerValue } from './worker/protocol.js';
export {
  assembleFnOverlay,
  materializeFnOverlay,
} from './overlay/fn-pairs.js';
export { finishOverlayResult } from './overlay/build-derived.js';
export type { OverlayPartialSummary } from './overlay/build-derived.js';
