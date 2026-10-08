import type { CellValue } from '../types.js';

/** True when the cell is blank for keying / optional-field purposes. */
export function isBlank(value: CellValue): boolean {
  if (value === null) {
    return true;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  return false;
}

/** Collapse blank-like values to `null`. */
export function normalizeEmpty(value: CellValue): CellValue {
  if (isBlank(value)) {
    return null;
  }
  return value;
}
