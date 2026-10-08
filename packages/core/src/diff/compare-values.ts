import type { CellComparator, CellValue, NumericTolerance } from '../types.js';

function asFiniteNumber(value: CellValue): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed !== '' && /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) {
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : undefined;
    }
  }
  return undefined;
}

/**
 * Equal when `|a - b| <= max(absolute, relative * max(|a|, |b|))`.
 */
export function numbersEqual(a: number, b: number, tolerance: NumericTolerance): boolean {
  const diff = Math.abs(a - b);
  const scale = Math.max(Math.abs(a), Math.abs(b));
  const allowed = Math.max(tolerance.absolute, tolerance.relative * scale);
  return diff <= allowed;
}

export function valuesEqual(
  left: CellValue,
  right: CellValue,
  tolerance: NumericTolerance,
  custom?: CellComparator,
): boolean {
  if (custom !== undefined) {
    return custom(left, right, { numericTolerance: tolerance });
  }

  if (left === right) {
    return true;
  }

  const leftNum = asFiniteNumber(left);
  const rightNum = asFiniteNumber(right);
  if (leftNum !== undefined && rightNum !== undefined) {
    return numbersEqual(leftNum, rightNum, tolerance);
  }

  return false;
}
