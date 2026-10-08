import type { Limits, NumericTolerance, NumericToleranceInput } from './types.js';

export const DEFAULT_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const DEFAULT_MAX_ROWS = 100_000;
export const DEFAULT_MAX_COLUMNS = 100;
export const DEFAULT_MAX_CELLS = 2_000_000;

export const DEFAULT_ABSOLUTE_TOLERANCE = 1e-6;
export const DEFAULT_RELATIVE_TOLERANCE = 1e-9;

export const DEFAULT_LIMITS: Limits = {
  maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES,
  maxRows: DEFAULT_MAX_ROWS,
  maxColumns: DEFAULT_MAX_COLUMNS,
  maxCells: DEFAULT_MAX_CELLS,
};

export const DEFAULT_NUMERIC_TOLERANCE: NumericTolerance = {
  absolute: DEFAULT_ABSOLUTE_TOLERANCE,
  relative: DEFAULT_RELATIVE_TOLERANCE,
};

/** Built-in case-insensitive key candidates for `inferSchema`. */
export const DEFAULT_KEY_CANDIDATES: readonly string[] = [
  'origin',
  'source',
  'from',
  'pickup',
  'destination',
  'dest',
  'to',
  'drop',
  'delivery',
  'area',
  'zone',
  'region',
  'pincode',
  'zipcode',
  'postal_code',
  'sku',
  'product_id',
  'item_code',
  'id',
  'code',
];

export function mergeLimits(overrides?: Partial<Limits>): Limits {
  if (overrides === undefined) {
    return DEFAULT_LIMITS;
  }
  return {
    maxFileSizeBytes: overrides.maxFileSizeBytes ?? DEFAULT_LIMITS.maxFileSizeBytes,
    maxRows: overrides.maxRows ?? DEFAULT_LIMITS.maxRows,
    maxColumns: overrides.maxColumns ?? DEFAULT_LIMITS.maxColumns,
    maxCells: overrides.maxCells ?? DEFAULT_LIMITS.maxCells,
  };
}

export function resolveNumericTolerance(input?: NumericToleranceInput): NumericTolerance {
  if (input === undefined) {
    return DEFAULT_NUMERIC_TOLERANCE;
  }
  if (typeof input === 'number') {
    return {
      absolute: input,
      relative: DEFAULT_RELATIVE_TOLERANCE,
    };
  }
  return {
    absolute: input.absolute ?? DEFAULT_ABSOLUTE_TOLERANCE,
    relative: input.relative ?? DEFAULT_RELATIVE_TOLERANCE,
  };
}
