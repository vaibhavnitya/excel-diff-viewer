import type { Row, Sheet, Workbook } from '@mojro/excel-diff-core';

function escapeCell(value: unknown): string {
  if (value == null) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function sheetToCsv(sheet: Sheet): string {
  const lines = [
    sheet.headers.map(escapeCell).join(','),
    ...sheet.rows.map((row: Row) =>
      sheet.headers.map((_: string, i: number) => escapeCell(row[i])).join(','),
    ),
  ];
  return `${lines.join('\n')}\n`;
}

export function workbookToCsv(workbook: Workbook): string {
  const sheet =
    workbook.sheets[workbook.activeSheetIndex] ?? workbook.sheets[0];
  if (sheet === undefined) {
    return '';
  }
  return sheetToCsv(sheet);
}
