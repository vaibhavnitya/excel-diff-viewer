import { normalizeCell } from '../normalize/normalize-cell.js';
import { isBlank } from '../normalize/normalize-empty.js';
import type { CellValue, Row, RowKey, Sheet } from '../types.js';

/**
 * Overlay join index: Map from composite key → overlay data-row indices.
 *
 * Wildcard matching (`wildcardOnEmpty: 'overlay'`) is NOT a single hash lookup.
 * For each base row we generate up to 2^N candidate keys (N = join column count)
 * by replacing any subset of join segments with empty, then union the hits.
 * N is typically 2–4, so 4–16 lookups per base row — acceptable; benchmarked in
 * `bench/overlay.bench.ts` against an equivalent `diffWorkbooks` call.
 */
export type OverlayJoinIndex = {
  readonly byKey: ReadonlyMap<RowKey, readonly number[]>;
  readonly joinIndexes: readonly number[];
  readonly wildcardOnEmpty: 'overlay' | 'none';
  readonly totalOverlay: number;
};

function segmentKey(value: CellValue): string {
  if (isBlank(value)) {
    return '';
  }
  return String(value);
}

/** Build a composite RowKey from already-normalized join segments. */
export function joinKeyFromSegments(segments: readonly string[]): RowKey {
  return segments.join('|') as RowKey;
}

/** Normalize join-column values from a dense row using the default pipeline. */
export function normalizedJoinSegments(
  row: Row,
  joinIndexes: readonly number[],
): string[] {
  const segments: string[] = new Array(joinIndexes.length);
  for (let i = 0; i < joinIndexes.length; i += 1) {
    const col = joinIndexes[i]!;
    const normalized = normalizeCell(row[col] ?? null);
    segments[i] = segmentKey(normalized);
  }
  return segments;
}

export function buildOverlayJoinIndex(
  sheet: Sheet,
  joinIndexes: readonly number[],
  wildcardOnEmpty: 'overlay' | 'none',
): OverlayJoinIndex {
  const byKey = new Map<RowKey, number[]>();

  for (let rowIndex = 0; rowIndex < sheet.rows.length; rowIndex += 1) {
    const row = sheet.rows[rowIndex]!;
    const segments = normalizedJoinSegments(row, joinIndexes);
    const key = joinKeyFromSegments(segments);
    const list = byKey.get(key);
    if (list === undefined) {
      byKey.set(key, [rowIndex]);
    } else {
      list.push(rowIndex);
    }
  }

  return {
    byKey,
    joinIndexes,
    wildcardOnEmpty,
    totalOverlay: sheet.rows.length,
  };
}

/**
 * Look up all overlay row indices that match a base row's join key.
 * Deduplicates when the same overlay row is reachable via multiple candidates.
 */
export function lookupOverlayMatches(
  index: OverlayJoinIndex,
  baseRow: Row,
  baseJoinIndexes: readonly number[],
): number[] {
  const baseSegments = normalizedJoinSegments(baseRow, baseJoinIndexes);

  if (index.wildcardOnEmpty === 'none') {
    const key = joinKeyFromSegments(baseSegments);
    const hit = index.byKey.get(key);
    return hit === undefined ? [] : [...hit];
  }

  // wildcardOnEmpty: 'overlay' — 2^N candidate keys
  const n = baseSegments.length;
  const seen = new Set<number>();
  const out: number[] = [];
  const totalMasks = 1 << n;

  for (let mask = 0; mask < totalMasks; mask += 1) {
    const candidate: string[] = new Array(n);
    for (let i = 0; i < n; i += 1) {
      // bit set → treat that column as overlay-wildcard (empty segment)
      candidate[i] = (mask & (1 << i)) !== 0 ? '' : baseSegments[i]!;
    }
    const key = joinKeyFromSegments(candidate);
    const hit = index.byKey.get(key);
    if (hit === undefined) {
      continue;
    }
    for (const rowIndex of hit) {
      if (!seen.has(rowIndex)) {
        seen.add(rowIndex);
        out.push(rowIndex);
      }
    }
  }

  return out;
}
