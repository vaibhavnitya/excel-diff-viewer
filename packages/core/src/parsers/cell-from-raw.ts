import { canonicalizeParsedDate } from '../normalize/normalize-date.js';
import type { CellValue } from '../types.js';

/**
 * Coerce raw parser output into a `CellValue` (no `Date` objects).
 */
export function cellFromRaw(value: unknown): CellValue {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return canonicalizeParsedDate(value);
  }
  // SheetJS sometimes boxes values; stringify as last resort for fidelity.
  if (typeof value === 'object') {
    return String(value);
  }
  return null;
}
