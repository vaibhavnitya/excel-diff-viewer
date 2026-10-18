import type { DiffError, DiffErrorCode } from '@mojro/excel-diff-core';

const SUGGESTIONS: Record<DiffErrorCode, string> = {
  FILE_TOO_LARGE:
    'Split the file into smaller sheets, or increase the limit via the `limits.maxFileSizeBytes` prop.',
  TOO_MANY_ROWS:
    'Filter or split the sheet, or raise `limits.maxRows`.',
  TOO_MANY_COLUMNS:
    'Remove unused columns, or raise `limits.maxColumns`.',
  TOO_MANY_CELLS:
    'Reduce rows or columns, or raise `limits.maxCells`.',
  UNSUPPORTED_FORMAT:
    'Use a supported format: `.xlsx`, `.xls`, or `.csv`.',
  PARSE_ERROR:
    'Re-export the file from Excel/Sheets and try again. If it persists, the file may be corrupted.',
  INVALID_SCHEMA:
    'Check required key fields in the file, or mark blank keys as optional in the schema.',
  DUPLICATE_KEYS:
    'Deduplicate rows that share the same business key, or adjust `schema.keyFields`.',
  OVERLAY_AMBIGUOUS_MATCH:
    'Under rules compose each base row may match at most one overlay row. Disambiguate the overlay, or switch to fn compose.',
  SUMMARY_INVALID_CONFIG:
    'Check SummaryConfig: topN must be a positive integer, and column treatments must be numeric | categorical | date | boolean.',
  SUMMARY_COLUMN_NOT_FOUND:
    'A column or sheet named in SummaryConfig was not found. Use exact header names from the workbook.',
  WRITE_FAILED:
    'Retry the export. If it keeps failing, try fewer sheets or a smaller workbook.',
  INVALID_OPTIONS:
    'Check write options: sheet names must exist in the workbook, and sheets must not be an empty array.',
  WORKER_UNAVAILABLE:
    'Ensure the app runs in an environment with Web Workers (not blocked SSR or restricted iframes).',
  WORKER_CRASHED:
    'Retry the operation. If it keeps failing, try a smaller file or report the issue.',
  SCHEMA_INFERENCE_FAILED:
    'Pass an explicit `schema` with `keyFields` and `valueFields` instead of relying on inference.',
  CANCELLED: 'The operation was cancelled. Upload again if you still need results.',
};

const REPORTABLE: ReadonlySet<DiffErrorCode> = new Set([
  'PARSE_ERROR',
  'WORKER_CRASHED',
]);

export function suggestionFor(error: DiffError): string {
  return SUGGESTIONS[error.code];
}

export function isReportableError(error: DiffError): boolean {
  return REPORTABLE.has(error.code);
}

export function isWarningError(error: DiffError): boolean {
  return error.code === 'DUPLICATE_KEYS';
}
