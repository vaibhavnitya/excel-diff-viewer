import type { CellNormalizer, CellValue, DiffSchema, Row } from '../types.js';
import { normalizeCell } from './normalize-cell.js';

export function normalizeRow(
  row: Row,
  headers: readonly string[],
  normalizers?: DiffSchema['normalizers'],
): Row {
  const out: CellValue[] = new Array(headers.length);
  for (let i = 0; i < headers.length; i += 1) {
    const header = headers[i] ?? '';
    const custom: CellNormalizer | undefined = normalizers?.[header];
    out[i] = normalizeCell(row[i] ?? null, custom);
  }
  return out;
}
