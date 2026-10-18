import type {
  DiffError,
  DiffErrorCode,
  DiffResult,
  DiffSchema,
  RowKey,
  Workbook,
} from '@mojro/excel-diff-core';

export const schema: DiffSchema = {
  keyFields: ['origin', 'destination'],
  valueFields: ['base_rate', 'min_charge'],
};

export function workbook(names: readonly string[] = ['Sheet1', 'Rates']): Workbook {
  return {
    activeSheetIndex: 0,
    meta: { format: 'xlsx', filename: 'sample.xlsx' },
    sheets: names.map((name, sheetIndex) => ({
      name,
      headers: ['origin', 'destination', 'base_rate', 'min_charge'],
      rows: [
        ['US', 'CA', 10 + sheetIndex, 5],
        ['US', 'MX', 12 + sheetIndex, 6],
      ],
    })),
  };
}

export function diffResult(): DiffResult {
  return {
    headers: ['origin', 'destination', 'base_rate', 'min_charge'],
    stats: { added: 1, removed: 1, modified: 1, unchanged: 1 },
    summary: {
      totalKeys: 4,
      added: 1,
      removed: 1,
      modified: 1,
      unchanged: 1,
      fieldChanges: [
        {
          field: 'base_rate',
          changedRows: 1,
          numericChanges: {
            meanDelta: 3,
            meanAbsDelta: 3,
            maxAbsDelta: 3,
            increased: 1,
            decreased: 0,
          },
          categoricalChanges: null,
        },
      ],
      warnings: [],
    },
    rows: [
      {
        key: 'US|CA' as RowKey,
        status: 'unchanged',
        changes: [],
        rowA: ['US', 'CA', 10, 5],
        rowB: ['US', 'CA', 10, 5],
      },
      {
        key: 'US|MX' as RowKey,
        status: 'modified',
        changes: [{ field: 'base_rate', before: 12, after: 15 }],
        rowA: ['US', 'MX', 12, 6],
        rowB: ['US', 'MX', 15, 6],
      },
      {
        key: 'US|BR' as RowKey,
        status: 'added',
        changes: [],
        rowA: undefined,
        rowB: ['US', 'BR', 20, 8],
      },
      {
        key: 'US|PE' as RowKey,
        status: 'removed',
        changes: [],
        rowA: ['US', 'PE', 9, 4],
        rowB: undefined,
      },
    ],
  };
}

export function makeError(code: DiffErrorCode, message?: string): DiffError {
  return {
    code,
    message:
      message ??
      (code === 'FILE_TOO_LARGE'
        ? 'File is 48.00 MB, which exceeds the limit of 25.00 MB. Split the file or raise maxFileSizeBytes.'
        : `Error: ${code}`),
  };
}

export const ALL_ERROR_CODES: readonly DiffErrorCode[] = [
  'FILE_TOO_LARGE',
  'TOO_MANY_ROWS',
  'TOO_MANY_COLUMNS',
  'TOO_MANY_CELLS',
  'UNSUPPORTED_FORMAT',
  'PARSE_ERROR',
  'INVALID_SCHEMA',
  'DUPLICATE_KEYS',
  'OVERLAY_AMBIGUOUS_MATCH',
  'WORKER_UNAVAILABLE',
  'WORKER_CRASHED',
  'SCHEMA_INFERENCE_FAILED',
];
