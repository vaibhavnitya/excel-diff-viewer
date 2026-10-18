import type {
  CellValue,
  DiffResult,
  DiffRow,
  Row,
  Workbook,
} from '@mojro/excel-diff-core';

export const EDIT_STATUS_COLUMN = 'Edit Status';

/**
 * Build a single-sheet workbook from diff rows for XLSX export.
 * Columns: original headers (base order) + trailing "Edit Status".
 * Cell values follow §3.3 (after for added/modified, base for removed/unchanged).
 */
export function diffRowsToWorkbook(
  diff: DiffResult,
  rows: readonly DiffRow[],
  filename?: string,
): Workbook {
  const headers = [...diff.headers, EDIT_STATUS_COLUMN];
  const dataRows: Row[] = rows.map((row) => {
    const source: readonly CellValue[] | undefined =
      row.status === 'removed' || row.status === 'unchanged'
        ? row.rowA
        : row.rowB ?? row.rowA;
    const cells: CellValue[] = diff.headers.map(
      (_: string, i: number) => source?.[i] ?? null,
    );
    cells.push(row.status);
    return cells;
  });

  return {
    sheets: [
      {
        name: 'Diff',
        headers,
        rows: dataRows,
      },
    ],
    activeSheetIndex: 0,
    meta: { format: 'xlsx', filename },
  };
}
