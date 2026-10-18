import type { CellValue, NamedRow, Row } from '../types.js';

/** Materialize a dense row into a named-column view for ComposeFn. */
export function rowToNamed(row: Row, headers: readonly string[]): NamedRow {
  const out: Record<string, CellValue> = {};
  for (let i = 0; i < headers.length; i += 1) {
    out[headers[i]!] = row[i] ?? null;
  }
  return out;
}

/**
 * Two-pass helpers for `fn` compose: collect column union, then emit dense rows.
 * Base-column order is preserved; new keys append in first-seen insertion order.
 */
export function collectFnColumnUnion(
  baseHeaders: readonly string[],
  namedRows: readonly (NamedRow | null)[],
): string[] {
  const headers: string[] = [...baseHeaders];
  const seen = new Set<string>(baseHeaders);

  for (const named of namedRows) {
    if (named === null) {
      continue;
    }
    for (const key of Object.keys(named)) {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }
  }

  return headers;
}

export function namedToDense(named: NamedRow, headers: readonly string[]): Row {
  const out: CellValue[] = new Array(headers.length);
  for (let i = 0; i < headers.length; i += 1) {
    const key = headers[i]!;
    out[i] = Object.prototype.hasOwnProperty.call(named, key)
      ? (named[key] ?? null)
      : null;
  }
  return out;
}
