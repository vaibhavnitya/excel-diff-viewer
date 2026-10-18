import type { Sheet, Workbook } from '@mojro/excel-diff-core';

/** Wrap one or more sheets into a workbook for export. */
export function workbookFromSheets(
  sheets: readonly Sheet[],
  filename?: string,
): Workbook {
  return {
    sheets,
    activeSheetIndex: 0,
    meta: { format: 'xlsx', filename },
  };
}

/** Single-sheet workbook (e.g. active sheet / derived overlay). */
export function workbookFromSheet(sheet: Sheet, filename?: string): Workbook {
  return workbookFromSheets([sheet], filename);
}
