/**
 * Public TypeScript contract for `@your-scope/excel-diff-core`.
 * Types are the specification — implement against these, not the reverse.
 *
 * Parser-specific types live in `parsers/parser-contract.ts` (canonical)
 * and are re-exported here so consumers can import everything from `types`
 * / the package root.
 */

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

/** Recoverable success/failure. Prefer this over throwing in the engine. */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

// ---------------------------------------------------------------------------
// Cells, rows, sheets, workbooks (dense storage)
// ---------------------------------------------------------------------------

/**
 * A single cell value as stored after parse / normalization.
 * - `null` means blank / empty.
 * - Dates are never stored as `Date` (mutable, poor equality / JSON).
 *   Parsers canonicalize to ISO 8601 strings (`YYYY-MM-DD` or full datetime).
 */
export type CellValue = string | number | boolean | null;

/** One data row: dense array aligned to sheet headers by index. */
export type Row = readonly CellValue[];

/** Branded composite key string (e.g. `us|*|air`). */
export type RowKey = string & { readonly __brand: 'RowKey' };

export type FileFormat = 'xlsx' | 'csv';

export type Sheet = {
  readonly name: string;
  /** Column names; index `i` corresponds to `rows[*][i]`. */
  readonly headers: readonly string[];
  /** Data rows only (header row is not included). */
  readonly rows: readonly Row[];
};

export type Workbook = {
  readonly sheets: readonly Sheet[];
  /** Index into `sheets` for the active / primary sheet. */
  readonly activeSheetIndex: number;
  readonly meta: {
    readonly format: FileFormat;
    readonly filename?: string;
  };
};

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

export type Limits = {
  readonly maxFileSizeBytes: number;
  readonly maxRows: number;
  readonly maxColumns: number;
  readonly maxCells: number;
};

// ---------------------------------------------------------------------------
// Schema, normalizers, comparators
// ---------------------------------------------------------------------------

/**
 * Resolved numeric tolerance used at comparison time.
 * Equal when `|a - b| <= max(absolute, relative * max(|a|, |b|))`.
 */
export type NumericTolerance = {
  readonly absolute: number;
  readonly relative: number;
};

/**
 * Input form for schema / options.
 * - `number` shorthand sets `absolute` only; `relative` stays at default `1e-9`.
 * - Object form may override either field; omitted fields use defaults
 *   (`absolute: 1e-6`, `relative: 1e-9`).
 */
export type NumericToleranceInput =
  | number
  | {
      readonly absolute?: number;
      readonly relative?: number;
    };

/** Pure cell transform used before keying / comparison. */
export type CellNormalizer = (value: CellValue) => CellValue;

/** Pure equality check for a value field; default uses numeric tolerance. */
export type CellComparator = (
  left: CellValue,
  right: CellValue,
  context: { readonly numericTolerance: NumericTolerance },
) => boolean;

export type DiffSchema = {
  /** Header names that form the composite business key. */
  readonly keyFields: readonly string[];
  /** Header names compared for added/removed/modified detection. */
  readonly valueFields: readonly string[];
  /**
   * Subset of `keyFields`. When blank after normalization, that segment
   * becomes `*` in the composite key (exact-string bucket, not pattern match).
   * Blank **required** key fields (not in this list) yield `INVALID_SCHEMA`
   * per row — see `InvalidSchemaErrorDetails`.
   */
  readonly optionalKeyFields?: readonly string[];
  /** Per-header normalizers; unset headers use built-in defaults. */
  readonly normalizers?: Readonly<Record<string, CellNormalizer>>;
  /** Per-header comparators; unset headers use built-in defaults. */
  readonly comparators?: Readonly<Record<string, CellComparator>>;
  /**
   * Numeric equality tolerance.
   * Defaults: `{ absolute: 1e-6, relative: 1e-9 }`.
   * A bare `number` sets absolute only.
   */
  readonly numericTolerance?: NumericToleranceInput;
};

export type InferSchemaOptions = {
  /**
   * Case-insensitive header names treated as key candidates.
   * Defaults to the built-in rate-card / logistics list.
   */
  readonly keyCandidates?: readonly string[];
};

// ---------------------------------------------------------------------------
// Diff result
// ---------------------------------------------------------------------------

export type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

export type DiffChange = {
  readonly field: string;
  readonly before: CellValue;
  readonly after: CellValue;
};

export type DiffRow = {
  readonly key: RowKey;
  readonly status: DiffStatus;
  /** Populated when `status === 'modified'`; otherwise empty. */
  readonly changes: readonly DiffChange[];
  /** Dense row from workbook A when present. */
  readonly rowA: Row | undefined;
  /** Dense row from workbook B when present. */
  readonly rowB: Row | undefined;
};

export type DiffStats = {
  readonly added: number;
  readonly removed: number;
  readonly modified: number;
  readonly unchanged: number;
};

export type DiffResult = {
  /** Headers for the sheet that was diffed (aligned with `DiffRow` cells). */
  readonly headers: readonly string[];
  readonly rows: readonly DiffRow[];
  readonly stats: DiffStats;
};

/**
 * Options for `diffWorkbooks` / `diffWorkbooksAsync`.
 * Pass as the third argument: `diffWorkbooks(a, b, { schema, sheetName?, limits? })`.
 * Cooperative progress / cancellation for the async form use a separate
 * {@link DiffControl} fourth argument — not this object.
 */
export type DiffWorkbooksOptions = {
  readonly schema: DiffSchema;
  /** Sheet name; defaults to each workbook's active sheet. */
  readonly sheetName?: string;
  readonly limits?: Partial<Limits>;
};

/**
 * Cooperative control for `diffWorkbooksAsync` (Worker shell / long diffs).
 * Passed as the fourth argument: `diffWorkbooksAsync(a, b, options, control)`.
 * Sync `diffWorkbooks` has no control parameter.
 */
export type DiffControl = {
  /** Checked between chunks; when true the async diff returns CANCELLED. */
  readonly isCancelled: () => boolean;
  /** Called after each chunk with keys processed so far and total keys. */
  readonly onProgress: (processed: number, total: number) => void;
  /** Keys per chunk before yield / progress. Default: 5000. */
  readonly chunkSize?: number;
  /** Yield between chunks. Default: `await new Promise(r => setTimeout(r, 0))`. */
  readonly yieldBetweenChunks?: () => Promise<void>;
};

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Stable error codes (public API). Switch on `code`, not `message`.
 * `WORKER_*` / `CANCELLED` are used by the Worker shell (Phase 2+).
 */
export type DiffErrorCode =
  | 'FILE_TOO_LARGE'
  | 'TOO_MANY_ROWS'
  | 'TOO_MANY_COLUMNS'
  | 'TOO_MANY_CELLS'
  | 'UNSUPPORTED_FORMAT'
  | 'PARSE_ERROR'
  | 'INVALID_SCHEMA'
  | 'SCHEMA_INFERENCE_FAILED'
  | 'DUPLICATE_KEYS'
  | 'WORKER_UNAVAILABLE'
  | 'WORKER_CRASHED'
  | 'CANCELLED';

export type DiffError = {
  readonly code: DiffErrorCode;
  /** Human-readable, actionable; may change between versions. */
  readonly message: string;
  /** Structured context for UI / logging (row indexes, keys, limits, …). */
  readonly details?: Readonly<Record<string, unknown>>;
};

/**
 * Suggested `details` for `INVALID_SCHEMA` when a required key field is blank.
 * Message shape:
 *   File 'rates.xlsx': row 42 has blank 'origin' field, which is a required key.
 *   Fix the file or mark 'origin' as optional in the schema.
 */
export type InvalidSchemaErrorDetails = {
  readonly filename?: string;
  /** 1-based row number in the source file (header is row 1). */
  readonly rowNumber: number;
  readonly field: string;
};

// ---------------------------------------------------------------------------
// Parser contract (canonical: parsers/parser-contract.ts)
// ---------------------------------------------------------------------------

export type { ParseFileOptions, ParseInput, Parser } from './parsers/parser-contract.js';
