import { createDiffError } from '../errors.js';
import type { DiffError, RowKey } from '../types.js';

export type KeyedRow = {
  readonly key: RowKey;
  readonly dataRowIndex: number;
};

/**
 * Returns a DUPLICATE_KEYS error if any key appears more than once; otherwise undefined.
 */
export function findDuplicateKeysError(
  keyed: readonly KeyedRow[],
  side: 'a' | 'b',
  filename?: string,
): DiffError | undefined {
  const seen = new Map<RowKey, number[]>();
  for (const item of keyed) {
    const list = seen.get(item.key);
    const fileRow = item.dataRowIndex + 2;
    if (list === undefined) {
      seen.set(item.key, [fileRow]);
    } else {
      list.push(fileRow);
    }
  }

  for (const [key, rows] of seen) {
    if (rows.length > 1) {
      const label = filename === undefined ? 'File' : `File '${filename}'`;
      return createDiffError(
        'DUPLICATE_KEYS',
        `${label} (side ${side}) has duplicate key '${key}' at rows ${rows.join(', ')}. Remove or merge duplicates before diffing.`,
        { key, rowNumbers: rows, side, filename },
      );
    }
  }

  return undefined;
}
