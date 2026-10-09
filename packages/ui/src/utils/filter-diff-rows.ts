import type { DiffRow, DiffSchema } from '@mojro/excel-diff-core';
import { formatCellValue } from './format-cell.js';

function rowText(row: DiffRow, schema: DiffSchema, headers: readonly string[]): string {
  const parts: string[] = [row.key, row.status];
  const source = row.rowB ?? row.rowA;
  for (const field of schema.keyFields) {
    const idx = headers.indexOf(field);
    if (idx >= 0) {
      parts.push(formatCellValue(source?.[idx]));
    }
  }
  for (const field of schema.valueFields) {
    const idx = headers.indexOf(field);
    if (idx >= 0) {
      parts.push(formatCellValue(row.rowA?.[idx]));
      parts.push(formatCellValue(row.rowB?.[idx]));
    }
  }
  for (const change of row.changes) {
    parts.push(formatCellValue(change.before), formatCellValue(change.after));
  }
  return parts.join(' ').toLowerCase();
}

export function filterDiffRows(
  rows: readonly DiffRow[],
  schema: DiffSchema,
  headers: readonly string[],
  options: {
    readonly showOnlyChanges?: boolean;
    readonly searchQuery?: string;
  },
): readonly DiffRow[] {
  const query = options.searchQuery?.trim().toLowerCase() ?? '';
  return rows.filter((row) => {
    if (options.showOnlyChanges === true && row.status === 'unchanged') {
      return false;
    }
    if (query.length === 0) {
      return true;
    }
    return rowText(row, schema, headers).includes(query);
  });
}
