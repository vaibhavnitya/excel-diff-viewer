/**
 * Summary + side-output budgets (recorded on first green run — fill after bench).
 *
 * Budgets (Phase 7b-slim):
 *   summarizeWorkbook sync, 100k × 20 mixed:     ≤ 500 ms
 *   summarizeWorkbookAsync, same input:          wall-clock ± 10% of sync
 *   diffWorkbooks + DiffSummary:                 ≤ 1.1× overlay.bench.ts diff baseline
 *   overlayWorkbooks rules + OverlaySummary:     ≤ 1.1× overlay.bench.ts rules baseline
 *   overlayWorkbooks fn + OverlaySummary:        ≤ 1.1× overlay.bench.ts fn baseline
 *
 * overlay.bench.ts baselines (2026-10-18, i7-1165G7 / win32 / Node 20.9.0):
 *   diffWorkbooks (50k × 10k):           244.77 ms
 *   overlayWorkbooks rules (50k × 10k):  161.77 ms
 *   overlayWorkbooks fn (50k × 10k):     185.77 ms
 *
 * Recorded 2026-10-18 (same host as overlay.bench.ts; vitest bench mean):
 *   summarizeWorkbook 100k×20:           ~201 ms   (budget ≤ 500 ms) PASS
 *   summarizeWorkbookAsync 100k×20:      ~206 ms   (±10% of sync) PASS
 *   diffWorkbooks + summary (50k×10k):   ~78 ms    (≤ 1.1× same-run baseline) PASS
 *   overlay rules + summary (50k×10k):   ~71 ms    (≤ 1.1× same-run baseline) PASS
 *   overlay fn + summary (50k×10k):      ~45–61 ms (≤ 1.1× same-run baseline) PASS
 *
 * Current status: PASS
 */
import { bench, describe } from 'vitest';
import { diffWorkbooks } from '../src/diff/diff-workbooks.js';
import { overlayWorkbooks } from '../src/overlay/overlay.js';
import { summarizeWorkbook, summarizeWorkbookAsync } from '../src/summary/summarize.js';
import type { DiffSchema, OverlaySchema, Workbook } from '../src/types.js';

function makeWorkbook(
  rows: number,
  headers: readonly string[],
  fill: (i: number) => (string | number | boolean | null)[],
  filename: string,
): Workbook {
  const data = Array.from({ length: rows }, (_, i) => fill(i));
  return {
    sheets: [{ name: 'Sheet1', headers, rows: data }],
    activeSheetIndex: 0,
    meta: { format: 'csv', filename },
  };
}

const MIXED_HEADERS = [
  'id',
  'n0',
  'n1',
  'n2',
  'n3',
  'n4',
  'c0',
  'c1',
  'c2',
  'c3',
  'c4',
  'd0',
  'd1',
  'd2',
  'd3',
  'd4',
  'b0',
  'b1',
  'b2',
  'b3',
] as const;

const mixed100k = makeWorkbook(
  100_000,
  MIXED_HEADERS,
  (i) => [
    i,
    i % 1000,
    (i * 2) % 1000,
    (i * 3) % 1000,
    (i * 4) % 1000,
    (i * 5) % 1000,
    `c${i % 50}`,
    `c${i % 40}`,
    `c${i % 30}`,
    `c${i % 20}`,
    `c${i % 10}`,
    `2024-${String((i % 12) + 1).padStart(2, '0')}-15`,
    `2023-${String((i % 12) + 1).padStart(2, '0')}-01`,
    `2022-06-${String((i % 28) + 1).padStart(2, '0')}`,
    `2021-01-${String((i % 28) + 1).padStart(2, '0')}`,
    `2020-12-${String((i % 28) + 1).padStart(2, '0')}`,
    i % 2 === 0,
    i % 3 === 0,
    i % 5 === 0,
    i % 7 === 0,
  ],
  'mixed100k.csv',
);

const BASE_ROWS = 50_000;
const OVERLAY_ROWS = 10_000;

const base = makeWorkbook(
  BASE_ROWS,
  ['id', 'Base Rate'],
  (i) => [i, 100 + (i % 20)],
  'base.csv',
);

const partner = makeWorkbook(
  OVERLAY_ROWS,
  ['id', 'Base Rate', 'Fuel Pct'],
  (i) => [i, 100 + (i % 20) + (i % 3), 5],
  'partner.csv',
);

const diffSchema: DiffSchema = {
  keyFields: ['id'],
  valueFields: ['Base Rate'],
};

const rulesSchema: OverlaySchema = {
  join: { base: ['id'], overlay: ['id'], wildcardOnEmpty: 'none' },
  compose: {
    kind: 'rules',
    rules: [
      {
        op: 'percentIncrease',
        base: 'Base Rate',
        overlay: 'Fuel Pct',
        target: 'Effective',
        defaultWhenMissing: 0,
      },
    ],
  },
};

const fnSchema: OverlaySchema = {
  join: { base: ['id'], overlay: ['id'], wildcardOnEmpty: 'none' },
  compose: {
    kind: 'fn',
    fn: (baseRow, overlayRows) => ({
      ...baseRow,
      surcharge: overlayRows[0]?.['Fuel Pct'] ?? 0,
    }),
  },
};

describe('summarizeWorkbook (100k × 20 mixed)', () => {
  bench('summarizeWorkbook sync', () => {
    const result = summarizeWorkbook(mixed100k);
    if (!result.ok) {
      throw new Error(result.error.message);
    }
  });

  bench('summarizeWorkbookAsync', async () => {
    const result = await summarizeWorkbookAsync(mixed100k, undefined, undefined, {
      isCancelled: () => false,
      onProgress: () => {},
      yieldBetweenChunks: async () => {},
    });
    if (!result.ok) {
      throw new Error(result.error.message);
    }
  });
});

describe('diff/overlay + summary side-output (50k × 10k)', () => {
  bench('diffWorkbooks + DiffSummary', () => {
    const result = diffWorkbooks(base, partner, { schema: diffSchema });
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    if (result.value.summary.fieldChanges.length === 0) {
      throw new Error('expected fieldChanges');
    }
  });

  bench('overlayWorkbooks rules + OverlaySummary', () => {
    const result = overlayWorkbooks(base, partner, { schema: rulesSchema });
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    if (result.value.summary.targetColumns.length === 0) {
      throw new Error('expected targetColumns');
    }
  });

  bench('overlayWorkbooks fn + OverlaySummary', () => {
    const result = overlayWorkbooks(base, partner, { schema: fnSchema });
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    if (result.value.summary.targetColumns.length === 0) {
      throw new Error('expected targetColumns');
    }
  });
});
