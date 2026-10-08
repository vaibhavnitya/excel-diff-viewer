import type { CellValue } from '../types.js';
import { normalizeEmpty } from './normalize-empty.js';

/**
 * Coerce numeric-looking strings to numbers. Leaves non-numeric strings as-is
 * (after empty normalize) so key fields like "12A" stay strings.
 */
export function normalizeNumber(value: CellValue): CellValue {
  const emptied = normalizeEmpty(value);
  if (emptied === null || typeof emptied === 'boolean') {
    return emptied;
  }
  if (typeof emptied === 'number') {
    return Number.isFinite(emptied) ? emptied : null;
  }
  const trimmed = emptied.trim();
  // Reject if not a plain decimal / scientific number
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) {
    return emptied;
  }
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : emptied;
}
