import type { CellValue } from '../types.js';
import { normalizeEmpty } from './normalize-empty.js';

/** Trim and lowercase strings; leave non-strings unchanged (after empty normalize). */
export function normalizeString(value: CellValue): CellValue {
  const emptied = normalizeEmpty(value);
  if (typeof emptied !== 'string') {
    return emptied;
  }
  return emptied.trim().toLowerCase();
}
