/**
 * Baseline numbers (recorded 2026-10-18 on Intel i7-1165G7 / 16GB / win32 x64, Node v20.9.0):
 *   diffWorkbooks (50k × 10k):           244.77 ms
 *   overlayWorkbooks rules (50k × 10k):  161.77 ms  (0.66x diff)
 *   overlayWorkbooks fn (50k × 10k):     185.77 ms  (0.76x diff)
 *
 * Budget: rules compose must be ≤ 1.1x diff baseline.
 * Current status: PASS
 *
 * Re-record after any change to overlay engine or diff engine.
 *
 * Run: npm run bench -w @mojro/excel-diff-core
 */
import { bench, describe } from 'vitest';
import { diffWorkbooks } from '../src/diff/diff-workbooks.js';
import { overlayWorkbooks } from '../src/overlay/overlay.js';
import type { DiffSchema, OverlaySchema, Workbook } from '../src/types.js';

function makeWorkbook(
  rows: number,
  headers: readonly string[],
  fill: (i: number) => (string | number | null)[],
  filename: string,
): Workbook {
  const data = Array.from({ length: rows }, (_, i) => fill(i));
  return {
    sheets: [{ name: 'Sheet1', headers, rows: data }],
    activeSheetIndex: 0,
    meta: { format: 'csv', filename },
  };
}

const BASE_ROWS = 50_000;
const OVERLAY_ROWS = 10_000;

/** 50k-row base — shared across diff + overlay benches. */
const base = makeWorkbook(
  BASE_ROWS,
  ['id', 'Base Rate'],
  (i) => [i, 100 + (i % 20)],
  'base.csv',
);

/**
 * 10k-row partner — ids 0..9999 align with the first 10k base rows.
 * Includes both Fuel Pct (overlay) and Base Rate (diff value field).
 */
const partner = makeWorkbook(
  OVERLAY_ROWS,
  ['id', 'Base Rate', 'Fuel Pct'],
  (i) => [i, 100 + (i % 20), 5],
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
    // Trivial fn — measures pairs + two-pass overhead, not compose logic cost.
    fn: (baseRow) => baseRow,
  },
};

describe('overlay vs diff (50k base × 10k partner)', () => {
  bench('diffWorkbooks baseline', () => {
    const result = diffWorkbooks(base, partner, { schema: diffSchema });
    if (!result.ok) {
      throw new Error(result.error.message);
    }
  });

  bench('overlayWorkbooks rules', () => {
    const result = overlayWorkbooks(base, partner, { schema: rulesSchema });
    if (!result.ok) {
      throw new Error(result.error.message);
    }
  });

  bench('overlayWorkbooks fn (identity)', () => {
    const result = overlayWorkbooks(base, partner, { schema: fnSchema });
    if (!result.ok) {
      throw new Error(result.error.message);
    }
  });
});
