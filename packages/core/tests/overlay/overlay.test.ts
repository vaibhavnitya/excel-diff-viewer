import { describe, expect, it } from 'vitest';
import {
  overlayWorkbooks,
  overlayWorkbooksAsync,
} from '../../src/overlay/overlay.js';
import type { OverlaySchema } from '../../src/types.js';
import { sheet, wb } from './helpers.js';

const baseWb = wb(
  [
    sheet('Rates', ['Lane', 'Vehicle Type', 'Base Rate'], [
      ['L1', 'Van', 100],
      ['L2', 'Van', 120],
      ['L3', 'Truck', 200],
      ['L4', 'Bike', 40],
    ]),
  ],
  'base.csv',
);

const overlayWb = wb(
  [
    sheet('Surcharge', ['Vehicle Type', 'Fuel Pct'], [
      ['Van', 5],
      ['Truck', 8],
      [null, 1], // wildcard — matches all when wildcardOnEmpty=overlay
    ]),
  ],
  'overlay.csv',
);

const rulesSchema: OverlaySchema = {
  join: {
    base: ['Vehicle Type'],
    overlay: ['Vehicle Type'],
    wildcardOnEmpty: 'overlay',
  },
  compose: {
    kind: 'rules',
    rules: [
      {
        op: 'percentIncrease',
        base: 'Base Rate',
        overlay: 'Fuel Pct',
        target: 'Effective Rate',
        defaultWhenMissing: 0,
      },
    ],
  },
  passthrough: 'all',
};

describe('overlayWorkbooks rules', () => {
  it('produces effective rates for matched rows', () => {
    // Van matches both Van(5) and wildcard(1) → ambiguous
    const noWildcard = {
      ...rulesSchema,
      join: { ...rulesSchema.join, wildcardOnEmpty: 'none' as const },
    };
    const simpleOverlay = wb([
      sheet('Surcharge', ['Vehicle Type', 'Fuel Pct'], [
        ['Van', 5],
        ['Truck', 8],
      ]),
    ]);
    const result = overlayWorkbooks(baseWb, simpleOverlay, { schema: noWildcard });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.summary.matched).toBe(3);
    expect(result.value.summary.unmatched).toBe(1);
    const rows = result.value.workbook.sheets[0]!.rows;
    expect(rows[0]).toEqual(['L1', 'Van', 100, 105]);
    expect(rows[2]).toEqual(['L3', 'Truck', 200, 216]);
    expect(rows[3]?.[3]).toBe(40); // defaultWhenMissing 0
  });

  it('fails on ambiguous match under rules', () => {
    const result = overlayWorkbooks(baseWb, overlayWb, { schema: rulesSchema });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('OVERLAY_AMBIGUOUS_MATCH');
    expect(result.error.details?.overlayRowIndices).toEqual([0, 2]);
  });

  it('passthrough array filters base columns', () => {
    const simpleOverlay = wb([
      sheet('Surcharge', ['Vehicle Type', 'Fuel Pct'], [['Van', 5]]),
    ]);
    const result = overlayWorkbooks(baseWb, simpleOverlay, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'], wildcardOnEmpty: 'none' },
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'percentIncrease',
              base: 'Base Rate',
              overlay: 'Fuel Pct',
              target: 'Effective Rate',
              defaultWhenMissing: 0,
            },
          ],
        },
        passthrough: ['Lane', 'Base Rate'],
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.workbook.sheets[0]!.headers).toEqual([
      'Lane',
      'Base Rate',
      'Effective Rate',
    ]);
  });

  it('combines multiple rules with distinct targets', () => {
    const ov = wb([
      sheet('S', ['Vehicle Type', 'Fuel Pct', 'Fee'], [
        ['Van', 5, 10],
      ]),
    ]);
    const result = overlayWorkbooks(baseWb, ov, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'], wildcardOnEmpty: 'none' },
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'percentIncrease',
              base: 'Base Rate',
              overlay: 'Fuel Pct',
              target: 'With Fuel',
              defaultWhenMissing: 0,
            },
            {
              op: 'add',
              base: 'Base Rate',
              overlay: 'Fee',
              target: 'With Fee',
              defaultWhenMissing: 0,
            },
          ],
        },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.workbook.sheets[0]!.headers).toContain('With Fuel');
    expect(result.value.workbook.sheets[0]!.headers).toContain('With Fee');
    expect(result.value.workbook.sheets[0]!.rows[0]?.[3]).toBe(105);
    expect(result.value.workbook.sheets[0]!.rows[0]?.[4]).toBe(110);
  });
});

describe('overlayWorkbooks fn', () => {
  it('runs fn inline and drops null returns', () => {
    const result = overlayWorkbooks(baseWb, overlayWb, {
      schema: {
        join: {
          base: ['Vehicle Type'],
          overlay: ['Vehicle Type'],
          wildcardOnEmpty: 'overlay',
        },
        compose: {
          kind: 'fn',
          fn: (baseRow, overlayRows) => {
            if (baseRow['Vehicle Type'] === 'Bike') return null;
            return {
              ...baseRow,
              __count: overlayRows.length,
            };
          },
        },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.summary.droppedByCompose).toBe(1);
    expect(result.value.workbook.sheets[0]!.rows).toHaveLength(3);
    expect(result.value.workbook.sheets[0]!.headers).toContain('__count');
  });

  it('calls fn with empty overlay array when unmatched', () => {
    const calls: number[] = [];
    const simpleOverlay = wb([
      sheet('S', ['Vehicle Type', 'Fuel Pct'], [['Van', 5]]),
    ]);
    overlayWorkbooks(baseWb, simpleOverlay, {
      schema: {
        join: {
          base: ['Vehicle Type'],
          overlay: ['Vehicle Type'],
          wildcardOnEmpty: 'none',
        },
        compose: {
          kind: 'fn',
          fn: (_base, overlayRows) => {
            calls.push(overlayRows.length);
            return { x: 1 };
          },
        },
      },
    });
    expect(calls).toEqual([1, 1, 0, 0]);
  });

  it('unions new columns from fn output', () => {
    const result = overlayWorkbooks(baseWb, overlayWb, {
      schema: {
        join: {
          base: ['Vehicle Type'],
          overlay: ['Vehicle Type'],
          wildcardOnEmpty: 'none',
        },
        compose: {
          kind: 'fn',
          fn: (baseRow, overlayRows) => {
            if (overlayRows.length === 0) {
              return { ...baseRow, onlyUnmatched: true };
            }
            return { ...baseRow, onlyMatched: overlayRows.length };
          },
        },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const headers = result.value.workbook.sheets[0]!.headers;
    expect(headers).toContain('onlyMatched');
    expect(headers).toContain('onlyUnmatched');
  });
});

describe('overlayWorkbooksAsync progress', () => {
  it('emits final (total, total) for single-chunk input', async () => {
    const events: Array<[number, number]> = [];
    const simpleOverlay = wb([
      sheet('Surcharge', ['Vehicle Type', 'Fuel Pct'], [
        ['Van', 5],
        ['Truck', 8],
      ]),
    ]);
    const result = await overlayWorkbooksAsync(
      baseWb,
      simpleOverlay,
      {
        schema: {
          ...rulesSchema,
          join: { ...rulesSchema.join, wildcardOnEmpty: 'none' },
        },
      },
      {
        isCancelled: () => false,
        onProgress: (p, t) => {
          events.push([p, t]);
        },
        chunkSize: 5000,
      },
    );
    expect(result.ok).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    const last = events[events.length - 1]!;
    expect(last[0]).toBe(last[1]);
    expect(last[1]).toBe(4);
  });

  it('emits (0, 0) for empty base', async () => {
    const events: Array<[number, number]> = [];
    const emptyBase = wb([sheet('Rates', ['Vehicle Type', 'Base Rate'], [])]);
    const result = await overlayWorkbooksAsync(
      emptyBase,
      overlayWb,
      { schema: rulesSchema },
      {
        isCancelled: () => false,
        onProgress: (p, t) => {
          events.push([p, t]);
        },
      },
    );
    expect(result.ok).toBe(true);
    expect(events).toContainEqual([0, 0]);
  });
});
