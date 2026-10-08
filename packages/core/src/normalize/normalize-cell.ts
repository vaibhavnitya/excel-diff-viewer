import type { CellNormalizer, CellValue } from '../types.js';
import { normalizeDate } from './normalize-date.js';
import { normalizeEmpty } from './normalize-empty.js';
import { normalizeNumber } from './normalize-number.js';
import { normalizeString } from './normalize-string.js';

/**
 * Default pipeline: empty → date → number → string (trim/lowercase).
 * Custom schema normalizers replace this entirely for that header.
 */
export function normalizeCell(value: CellValue, custom?: CellNormalizer): CellValue {
  if (custom !== undefined) {
    return custom(value);
  }
  const emptied = normalizeEmpty(value);
  const dated = normalizeDate(emptied);
  const numbered = normalizeNumber(dated);
  return normalizeString(numbered);
}
