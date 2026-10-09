import type { CellValue } from '@your-scope/excel-diff-core';

export function formatCellValue(value: CellValue | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}
