import type { Sheet, Workbook } from '../../src/types.js';

export function sheet(
  name: string,
  headers: readonly string[],
  rows: readonly (readonly (string | number | boolean | null)[])[],
): Sheet {
  return { name, headers, rows };
}

export function wb(
  sheets: readonly Sheet[],
  filename = 'test.csv',
): Workbook {
  return {
    sheets,
    activeSheetIndex: 0,
    meta: { format: 'csv', filename },
  };
}
