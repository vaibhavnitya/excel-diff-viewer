import type { CellValue, DiffResult, DiffSchema } from '@mojro/excel-diff-core';
import { formatCellValue } from '../utils/format-cell.js';

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function cellAt(
  headers: readonly string[],
  row: readonly CellValue[] | undefined,
  field: string,
): string {
  if (row === undefined) {
    return '';
  }
  const index = headers.indexOf(field);
  if (index < 0) {
    return '';
  }
  return formatCellValue(row[index]);
}

/**
 * Serialize a diff result to CSV.
 * Columns: status, ...keyFields, ...valueField_old, ...valueField_new
 */
export function diffToCSV(diff: DiffResult, schema: DiffSchema): string {
  const header = [
    'status',
    ...schema.keyFields,
    ...schema.valueFields.flatMap((field) => [`${field}_old`, `${field}_new`]),
  ];

  const lines = [header.map(escapeCsvField).join(',')];

  for (const row of diff.rows) {
    const keySource = row.rowB ?? row.rowA;
    const values = [
      row.status,
      ...schema.keyFields.map((field) => cellAt(diff.headers, keySource, field)),
      ...schema.valueFields.flatMap((field) => [
        cellAt(diff.headers, row.rowA, field),
        cellAt(diff.headers, row.rowB, field),
      ]),
    ];
    lines.push(values.map(escapeCsvField).join(','));
  }

  return `${lines.join('\n')}\n`;
}
