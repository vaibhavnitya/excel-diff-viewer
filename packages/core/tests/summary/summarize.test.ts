import { describe, expect, it, vi } from 'vitest';
import {
  createSummaryCache,
  summarizeWorkbook,
  summarizeWorkbookAsync,
} from '../../src/summary/summarize.js';
import type { SummaryConfig, Workbook } from '../../src/types.js';

function wb(
  headers: readonly string[],
  rows: readonly (readonly (string | number | boolean | null)[])[],
  sheetName = 'Sheet1',
): Workbook {
  return {
    sheets: [{ name: sheetName, headers, rows }],
    activeSheetIndex: 0,
    meta: { format: 'csv', filename: 't.csv' },
  };
}

describe('summarizeWorkbook sync', () => {
  it('summarizes each treatment in isolation', () => {
    const numeric = summarizeWorkbook(wb(['n'], [[1], [2], [3]]));
    expect(numeric.ok).toBe(true);
    if (!numeric.ok) return;
    expect(numeric.value.columns[0]).toMatchObject({
      treatment: 'numeric',
      mean: 2,
    });

    const cat = summarizeWorkbook(wb(['c'], [['a'], ['b'], ['a']]));
    expect(cat.ok && cat.value.columns[0]?.treatment).toBe('categorical');

    const date = summarizeWorkbook(
      wb(['d'], [['2024-01-01'], ['2024-06-01']]),
    );
    expect(date.ok && date.value.columns[0]?.treatment).toBe('date');

    const bool = summarizeWorkbook(wb(['b'], [[true], [false]]));
    expect(bool.ok && bool.value.columns[0]?.treatment).toBe('boolean');
  });

  it('falls back to categorical with warning on mixed types', () => {
    const result = summarizeWorkbook(wb(['m'], [[1], ['x']]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.columns[0]?.treatment).toBe('categorical');
    expect(
      result.value.warnings.some((w) => w.code === 'INFERENCE_FELL_BACK'),
    ).toBe(true);
  });

  it('skips all-null columns', () => {
    const result = summarizeWorkbook(wb(['a', 'b'], [[null, 1], [null, 2]]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.skippedColumns).toEqual([
      { column: 'a', reason: 'all-null' },
    ]);
    expect(result.value.columns.map((c) => c.column)).toEqual(['b']);
  });

  it('honors columns override with MIXED_TYPES warning', () => {
    const result = summarizeWorkbook(wb(['n'], [[1], ['x']]), {
      columns: { n: 'numeric' },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.columns[0]?.treatment).toBe('numeric');
    expect(result.value.warnings.some((w) => w.code === 'MIXED_TYPES')).toBe(
      true,
    );
  });

  it('excludes columns', () => {
    const result = summarizeWorkbook(wb(['a', 'b'], [[1, 2]]), {
      exclude: ['a'],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.columns.map((c) => c.column)).toEqual(['b']);
    expect(result.value.skippedColumns).toEqual([
      { column: 'a', reason: 'excluded' },
    ]);
  });

  it('uses default topN of 10 and truncates with warning', () => {
    const rows = Array.from({ length: 12 }, (_, i) => [`v${i}`] as const);
    const result = summarizeWorkbook(wb(['c'], rows));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const col = result.value.columns[0];
    expect(col?.treatment).toBe('categorical');
    if (col?.treatment !== 'categorical') return;
    expect(col.topValues).toHaveLength(10);
    expect(
      result.value.warnings.some((w) => w.code === 'TOP_N_TRUNCATED'),
    ).toBe(true);
  });

  it('does not warn when topN covers all distinct values', () => {
    const result = summarizeWorkbook(wb(['c'], [['a'], ['b']]), { topN: 5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.value.warnings.some((w) => w.code === 'TOP_N_TRUNCATED'),
    ).toBe(false);
  });

  it('preserves header column order', () => {
    const result = summarizeWorkbook(
      wb(['z', 'a', 'm'], [[1, 'x', true]]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.columns.map((c) => c.column)).toEqual([
      'z',
      'a',
      'm',
    ]);
  });

  it('counts categorical blanks vs nulls', () => {
    const result = summarizeWorkbook(wb(['c'], [[null], [''], ['a']]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const col = result.value.columns[0];
    expect(col?.treatment).toBe('categorical');
    if (col?.treatment !== 'categorical') return;
    expect(col.nullCount).toBe(1);
    expect(col.blankCount).toBe(1);
  });
});

describe('summarizeWorkbook cache', () => {
  it('hits on same workbook + config references', () => {
    const workbook = wb(['n'], [[1], [2]]);
    const config: SummaryConfig = { topN: 3 };
    const cache = createSummaryCache();

    // Instrument by wrapping cache via double-call identity of result object.
    const first = summarizeWorkbook(workbook, config, cache);
    const second = summarizeWorkbook(workbook, config, cache);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.value).toBe(first.value);
  });

  it('misses on different config reference with same shape', () => {
    const workbook = wb(['n'], [[1]]);
    const cache = createSummaryCache();
    const a = summarizeWorkbook(workbook, { topN: 3 }, cache);
    const b = summarizeWorkbook(workbook, { topN: 3 }, cache);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    // Different config object → recompute → new summary object
    expect(b.value).not.toBe(a.value);
  });

  it('does nothing when cache is omitted', () => {
    const workbook = wb(['n'], [[1]]);
    const a = summarizeWorkbook(workbook);
    const b = summarizeWorkbook(workbook);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.value).not.toBe(a.value);
  });
});

describe('summarizeWorkbookAsync', () => {
  it('matches sync on the same input', async () => {
    const workbook = wb(
      ['n', 'c'],
      [
        [1, 'a'],
        [2, 'b'],
        [3, 'a'],
      ],
    );
    const sync = summarizeWorkbook(workbook);
    const asyncResult = await summarizeWorkbookAsync(workbook);
    expect(sync.ok && asyncResult.ok).toBe(true);
    if (!sync.ok || !asyncResult.ok) return;
    expect(asyncResult.value).toEqual(sync.value);
  });

  it('emits final (total, total) even for small inputs', async () => {
    const workbook = wb(['n'], [[1]]);
    const progress: [number, number][] = [];
    await summarizeWorkbookAsync(workbook, undefined, undefined, {
      isCancelled: () => false,
      onProgress: (p, t) => progress.push([p, t]),
      chunkSize: 1,
    });
    expect(progress.length).toBeGreaterThan(0);
    const last = progress[progress.length - 1]!;
    expect(last[0]).toBe(last[1]);
  });

  it('stops on cancellation and does not cache', async () => {
    const rows = Array.from({ length: 25_000 }, (_, i) => [i] as const);
    const workbook = wb(['n'], rows);
    const cache = createSummaryCache();
    let calls = 0;
    const result = await summarizeWorkbookAsync(
      workbook,
      undefined,
      cache,
      {
        isCancelled: () => {
          calls += 1;
          return calls > 1;
        },
        onProgress: () => {},
        yieldBetweenChunks: async () => {},
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CANCELLED');

    // Subsequent call without cancel should compute fresh (no partial cache).
    const again = summarizeWorkbook(workbook, undefined, cache);
    expect(again.ok).toBe(true);
  });

  it('does not cache on validation error', async () => {
    const workbook = wb(['n'], [[1]]);
    const cache = createSummaryCache();
    const config: SummaryConfig = { exclude: ['missing'] };
    const result = await summarizeWorkbookAsync(
      workbook,
      config,
      cache,
      {
        isCancelled: () => false,
        onProgress: () => {},
      },
    );
    expect(result.ok).toBe(false);
    // Sanity: valid call still works with same cache
    const okResult = summarizeWorkbook(workbook, undefined, cache);
    expect(okResult.ok).toBe(true);
  });
});

describe('summarizeWorkbook validation', () => {
  it('surfaces SUMMARY_COLUMN_NOT_FOUND and SUMMARY_INVALID_CONFIG', () => {
    const workbook = wb(['a'], [[1]]);
    expect(summarizeWorkbook(workbook, { columns: { z: 'numeric' } }).ok).toBe(
      false,
    );
    expect(summarizeWorkbook(workbook, { topN: 0 }).ok).toBe(false);
  });
});

// Keep vitest happy if vi is unused in some runners
void vi;
