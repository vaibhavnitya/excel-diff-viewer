import type { DiffResult, DiffRow, Row, Workbook } from '@mojro/excel-diff-core';

/**
 * Two-sheet workbook for split-viewer export.
 * Ghost rows (missing side) are omitted — they are display artifacts.
 */
export function splitDiffToWorkbook(
  diff: DiffResult,
  rows: readonly DiffRow[],
  options?: {
    readonly baseSheetName?: string;
    readonly overlaySheetName?: string;
    readonly filename?: string;
  },
): Workbook {
  const headers = [...diff.headers];
  const baseRows: Row[] = [];
  const afterRows: Row[] = [];

  for (const row of rows) {
    if (row.rowA !== undefined) {
      baseRows.push(headers.map((_, i) => row.rowA![i] ?? null));
    }
    if (row.rowB !== undefined) {
      afterRows.push(headers.map((_, i) => row.rowB![i] ?? null));
    }
  }

  const baseName = options?.baseSheetName?.trim() || 'Base';
  const afterName = options?.overlaySheetName?.trim() || 'Overlay';

  // SheetJS rejects duplicate names — disambiguate if needed.
  const sheet2Name = afterName === baseName ? `${afterName} (B)` : afterName;

  return {
    sheets: [
      { name: baseName, headers, rows: baseRows },
      { name: sheet2Name, headers, rows: afterRows },
    ],
    activeSheetIndex: 0,
    meta: { format: 'xlsx', filename: options?.filename },
  };
}
