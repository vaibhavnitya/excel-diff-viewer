import type { CellValue } from '@mojro/excel-diff-core';

export function formatCellValue(value: CellValue | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}
