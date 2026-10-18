import type { CellValue, Sheet, Workbook } from '../../src/types.js';

/**
 * Structural workbook equality for round-trip tests.
 * Uses strict `===` on cell values (write must preserve stored types exactly).
 * Filename metadata may differ; sheet structure and values must match.
 */
export function cellsStrictEqual(a: CellValue, b: CellValue): boolean {
  return a === b;
}

export function sheetsStructurallyEqual(a: Sheet, b: Sheet): boolean {
  if (a.name !== b.name) return false;
  if (a.headers.length !== b.headers.length) return false;
  for (let i = 0; i < a.headers.length; i += 1) {
    if (a.headers[i] !== b.headers[i]) return false;
  }
  if (a.rows.length !== b.rows.length) return false;
  for (let r = 0; r < a.rows.length; r += 1) {
    const rowA = a.rows[r]!;
    const rowB = b.rows[r]!;
    if (rowA.length !== rowB.length) return false;
    for (let c = 0; c < rowA.length; c += 1) {
      if (!cellsStrictEqual(rowA[c] ?? null, rowB[c] ?? null)) {
        return false;
      }
    }
  }
  return true;
}

export function workbooksStructurallyEqual(a: Workbook, b: Workbook): boolean {
  if (a.sheets.length !== b.sheets.length) return false;
  for (let i = 0; i < a.sheets.length; i += 1) {
    if (!sheetsStructurallyEqual(a.sheets[i]!, b.sheets[i]!)) {
      return false;
    }
  }
  return true;
}
