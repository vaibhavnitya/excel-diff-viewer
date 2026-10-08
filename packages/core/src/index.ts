export const PACKAGE_NAME = '@your-scope/excel-diff-core' as const;

/** Phase 0 scaffold marker retained for demo / sibling package compatibility. */
export const SCAFFOLD_DEPENDENCIES: readonly string[] = [];

export type {
  CellComparator,
  CellNormalizer,
  CellValue,
  DiffChange,
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
  NumericTolerance,
  NumericToleranceInput,
  ParseFileOptions,
  ParseInput,
  Parser,
  Result,
  Row,
  RowKey,
  Sheet,
  Workbook,
} from './types.js';

export { createDiffError } from './errors.js';
export { err, isErr, isOk, ok } from './result.js';
export {
  DEFAULT_KEY_CANDIDATES,
  DEFAULT_LIMITS,
  DEFAULT_NUMERIC_TOLERANCE,
  mergeLimits,
  resolveNumericTolerance,
} from './defaults.js';

export { parseFile } from './parsers/parse-file.js';
export { detectFormat } from './parsers/detect-format.js';
export { xlsxParser } from './parsers/xlsx.js';
export { csvParser } from './parsers/csv.js';

export { inferSchema } from './schema/infer-schema.js';
export { buildKey } from './key/build-key.js';
export { diffWorkbooks } from './diff/diff-workbooks.js';
export { valuesEqual, numbersEqual } from './diff/compare-values.js';

export { normalizeCell } from './normalize/normalize-cell.js';
export { normalizeRow } from './normalize/normalize-row.js';
export { normalizeString } from './normalize/normalize-string.js';
export { normalizeNumber } from './normalize/normalize-number.js';
export { normalizeDate } from './normalize/normalize-date.js';
export { normalizeEmpty, isBlank } from './normalize/normalize-empty.js';
