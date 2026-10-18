import { describe, expect, it } from 'vitest';
import { finishOverlayResult } from '../../src/overlay/build-derived.js';
import { assembleFnOverlay } from '../../src/overlay/fn-pairs.js';
import { formatAvailableHeaders } from '../../src/overlay/header-index.js';
import {
  namedToDense,
  rowToNamed,
} from '../../src/overlay/named-row.js';
import {
  overlayWorkbooks,
  overlayWorkbooksAsync,
  overlayWorkbooksAsyncForWorker,
} from '../../src/overlay/overlay.js';
import {
  fromSerializableOverlayOptions,
  toSerializableOverlayOptions,
} from '../../src/overlay/serializable-schema.js';
import { validateOverlaySchema } from '../../src/overlay/validate.js';
import type { OverlaySchema, Workbook } from '../../src/types.js';
import { sheet, wb } from './helpers.js';

const base = wb([
  sheet('Rates', ['Vehicle Type', 'Base Rate', 'Note'], [
    ['Van', 100, 'a'],
    ['Truck', 200, 'b'],
  ]),
]);
const overlay = wb([
  sheet('S', ['Vehicle Type', 'Fuel Pct', 'Label'], [
    ['Van', 5, 'v'],
    ['Truck', 8, 't'],
  ]),
]);

describe('overlay coverage extras', () => {
  it('serializes and rehydrates rules + fn schemas', () => {
    const rules: OverlaySchema = {
      join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
      compose: {
        kind: 'rules',
        rules: [{ op: 'replace', overlay: 'Fuel Pct', target: 'Fuel' }],
      },
    };
    const ser = toSerializableOverlayOptions({ schema: rules });
    expect(ser.schema.compose.kind).toBe('rules');
    const back = fromSerializableOverlayOptions(ser);
    expect(back.schema.compose.kind).toBe('rules');

    const fnSchema: OverlaySchema = {
      join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
      compose: { kind: 'fn', fn: (r) => r },
    };
    const serFn = toSerializableOverlayOptions({ schema: fnSchema });
    expect(serFn.schema.compose).toEqual({ kind: 'fn' });
    const backFn = fromSerializableOverlayOptions(serFn);
    expect(backFn.schema.compose.kind).toBe('fn');
    const compose = backFn.schema.compose;
    if (compose.kind === 'fn') {
      expect(() => compose.fn({}, [])).toThrow(/Worker/);
    }
  });

  it('validates replace and passthrough rules', () => {
    const baseSheet = base.sheets[0]!;
    const overlaySheet = overlay.sheets[0]!;
    const okReplace = validateOverlaySchema(
      {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'rules',
          rules: [
            { op: 'replace', overlay: 'Fuel Pct', target: 'Fuel' },
            {
              op: 'passthrough',
              from: 'base',
              source: 'Note',
              target: 'NoteCopy',
            },
            {
              op: 'passthrough',
              from: 'overlay',
              source: 'Label',
            },
          ],
        },
      },
      baseSheet,
      overlaySheet,
    );
    expect(okReplace.ok).toBe(true);

    const badOverlaySource = validateOverlaySchema(
      {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'rules',
          rules: [
            { op: 'passthrough', from: 'overlay', source: 'Nope', target: 'X' },
          ],
        },
      },
      baseSheet,
      overlaySheet,
    );
    expect(badOverlaySource.ok).toBe(false);
  });

  it('formats empty available headers', () => {
    expect(formatAvailableHeaders([])).toBe('(none)');
  });

  it('finishOverlayResult builds workbook meta', () => {
    const result = finishOverlayResult(
      ['A'],
      [[1]],
      'Sheet',
      'base.csv',
      {
        totalBase: 1,
        totalOverlay: 1,
        matched: 1,
        unmatched: 0,
      },
      0,
    );
    expect(result.workbook.meta.overlay?.matched).toBe(1);
    expect(result.summary.droppedByCompose).toBe(0);
  });

  it('async cancel mid-chunk returns CANCELLED', async () => {
    let calls = 0;
    const result = await overlayWorkbooksAsync(
      base,
      overlay,
      {
        schema: {
          join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
          compose: {
            kind: 'rules',
            rules: [
              {
                op: 'percentIncrease',
                base: 'Base Rate',
                overlay: 'Fuel Pct',
                target: 'Eff',
              },
            ],
          },
        },
      },
      {
        isCancelled: () => {
          calls += 1;
          return calls > 1;
        },
        onProgress: () => {},
        chunkSize: 1,
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CANCELLED');
  });

  it('async fn path completes with progress', async () => {
    const events: number[] = [];
    const result = await overlayWorkbooksAsync(
      base,
      overlay,
      {
        schema: {
          join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
          compose: {
            kind: 'fn',
            fn: (row, rows) => ({ ...row, n: rows.length }),
          },
        },
      },
      {
        isCancelled: () => false,
        onProgress: (p) => {
          events.push(p);
        },
        chunkSize: 1,
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.workbook.sheets[0]!.headers).toContain('n');
    expect(events[events.length - 1]).toBe(2);
  });

  it('worker defer path returns fn-pairs', async () => {
    const outcome = await overlayWorkbooksAsyncForWorker(
      base,
      overlay,
      {
        schema: {
          join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
          compose: {
            kind: 'fn',
            fn: () => {
              throw new Error('should not run');
            },
          },
        },
      },
      {
        isCancelled: () => false,
        onProgress: () => {},
      },
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value.kind).toBe('fn-pairs');
    if (outcome.value.kind !== 'fn-pairs') return;
    expect(outcome.value.value.pairs).toHaveLength(2);
  });

  it('worker rules path returns finished result', async () => {
    const outcome = await overlayWorkbooksAsyncForWorker(base, overlay, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'multiply',
              base: 'Base Rate',
              overlay: 'Fuel Pct',
              target: 'Scaled',
            },
          ],
        },
      },
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value.kind).toBe('result');
  });

  it('multiply + replace + missing overlay cell paths', () => {
    const ov = wb([
      sheet('S', ['Vehicle Type', 'Fuel Pct'], [
        ['Van', null],
      ]),
    ]);
    const result = overlayWorkbooks(base, ov, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'multiply',
              base: 'Base Rate',
              overlay: 'Fuel Pct',
              target: 'M',
              defaultWhenMissing: 2,
            },
            { op: 'replace', overlay: 'Fuel Pct', target: 'R' },
          ],
        },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Van: empty fuel → default 2 → 200; replace → null
    expect(result.value.workbook.sheets[0]!.rows[0]?.[3]).toBe(200);
    expect(result.value.workbook.sheets[0]!.rows[0]?.[4]).toBeNull();
  });

  it('non-numeric overlay cell warns', () => {
    const ov = wb([
      sheet('S', ['Vehicle Type', 'Fuel Pct'], [['Van', 'x']]),
    ]);
    const result = overlayWorkbooks(base, ov, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'add',
              base: 'Base Rate',
              overlay: 'Fuel Pct',
              target: 'T',
            },
          ],
        },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.workbook.meta.overlay?.rowWarnings.length).toBe(1);
  });

  it('rejects unknown sheet name', () => {
    const result = overlayWorkbooks(base, overlay, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'add',
              base: 'Base Rate',
              overlay: 'Fuel Pct',
              target: 'T',
            },
          ],
        },
      },
      sheetName: 'Missing',
    });
    expect(result.ok).toBe(false);
  });

  it('worker fn path cancels mid-chunk', async () => {
    let n = 0;
    const outcome = await overlayWorkbooksAsyncForWorker(
      base,
      overlay,
      {
        schema: {
          join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
          compose: {
            kind: 'fn',
            fn: () => {
              throw new Error('no');
            },
          },
        },
      },
      {
        isCancelled: () => {
          n += 1;
          return n > 1;
        },
        onProgress: () => {},
        chunkSize: 1,
      },
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error.code).toBe('CANCELLED');
  });

  it('worker fn path without control returns pairs', async () => {
    const outcome = await overlayWorkbooksAsyncForWorker(base, overlay, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'fn',
          fn: () => ({ x: 1 }),
        },
      },
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value.kind).toBe('fn-pairs');
  });

  it('worker fn empty base emits (0,0)', async () => {
    const empty = wb([sheet('Rates', ['Vehicle Type', 'Base Rate'], [])]);
    const events: Array<[number, number]> = [];
    const outcome = await overlayWorkbooksAsyncForWorker(
      empty,
      overlay,
      {
        schema: {
          join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
          compose: {
            kind: 'fn',
            fn: (r) => r,
          },
        },
      },
      {
        isCancelled: () => false,
        onProgress: (p, t) => {
          events.push([p, t]);
        },
      },
    );
    expect(outcome.ok).toBe(true);
    expect(events).toContainEqual([0, 0]);
  });

  it('finishOverlayResult uses overlay.csv when baseFilename is undefined', () => {
    const result = finishOverlayResult(
      ['A'],
      [[1]],
      'Sheet',
      undefined,
      {
        totalBase: 1,
        totalOverlay: 0,
        matched: 0,
        unmatched: 1,
      },
      0,
    );
    expect(result.workbook.meta.filename).toBe('overlay.csv');
  });

  it('namedToDense keeps explicit null vs missing key', () => {
    const dense = namedToDense({ A: null, B: 1 }, ['A', 'B', 'C']);
    expect(dense).toEqual([null, 1, null]);
  });

  it('rowToNamed pads missing dense cells with null', () => {
    expect(rowToNamed([1], ['A', 'B'])).toEqual({ A: 1, B: null });
  });

  it('assembleFnOverlay cancels when isCancelled becomes true', () => {
    let calls = 0;
    const assembled = assembleFnOverlay(
      [
        { baseRow: [1], overlayRows: [], baseRowIndex: 0 },
        { baseRow: [2], overlayRows: [], baseRowIndex: 1 },
      ],
      (row) => row,
      ['A'],
      ['B'],
      'S',
      undefined,
      { totalBase: 2, totalOverlay: 0, matched: 0, unmatched: 2 },
      {
        chunkSize: 1,
        isCancelled: () => {
          calls += 1;
          return calls > 1;
        },
      },
    );
    expect(assembled.cancelled).toBe(true);
    expect(assembled.rows).toEqual([]);
  });

  it('assembleFnOverlay reports progress at chunk boundaries', () => {
    const progress: Array<[number, number]> = [];
    assembleFnOverlay(
      [
        { baseRow: [1], overlayRows: [], baseRowIndex: 0 },
        { baseRow: [2], overlayRows: [], baseRowIndex: 1 },
      ],
      (row) => row,
      ['A'],
      ['B'],
      'S',
      undefined,
      { totalBase: 2, totalOverlay: 0, matched: 0, unmatched: 2 },
      {
        chunkSize: 1,
        onProgress: (p, t) => {
          progress.push([p, t]);
        },
      },
    );
    expect(progress).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });

  it('ambiguous match details include ordered overlay indices', () => {
    const ov = wb([
      sheet('S', ['Vehicle Type', 'Fuel Pct'], [
        ['Van', 5],
        ['Van', 6],
      ]),
    ]);
    const result = overlayWorkbooks(base, ov, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'add',
              base: 'Base Rate',
              overlay: 'Fuel Pct',
              target: 'T',
            },
          ],
        },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('OVERLAY_AMBIGUOUS_MATCH');
    expect(result.error.details).toEqual({
      baseKey: 'van',
      baseRowIndex: 0,
      overlayRowIndices: [0, 1],
    });
  });

  it('async rules cancel after last chunk when isCancelled flips', async () => {
    let afterProgress = false;
    const result = await overlayWorkbooksAsync(
      base,
      overlay,
      {
        schema: {
          join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
          compose: {
            kind: 'rules',
            rules: [
              {
                op: 'add',
                base: 'Base Rate',
                overlay: 'Fuel Pct',
                target: 'T',
              },
            ],
          },
        },
      },
      {
        isCancelled: () => afterProgress,
        onProgress: () => {
          afterProgress = true;
        },
        chunkSize: 5000,
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CANCELLED');
  });

  it('async fn cancel during assembleFnOverlay', async () => {
    let cancel = false;
    const result = await overlayWorkbooksAsync(
      base,
      overlay,
      {
        schema: {
          join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
          compose: {
            kind: 'fn',
            fn: (row) => {
              cancel = true;
              return row;
            },
          },
        },
      },
      {
        isCancelled: () => cancel,
        onProgress: () => {},
        chunkSize: 5000,
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CANCELLED');
  });

  it('async rules ambiguous match mid-chunk', async () => {
    const ov = wb([
      sheet('S', ['Vehicle Type', 'Fuel Pct'], [
        ['Van', 5],
        ['Van', 7],
      ]),
    ]);
    const result = await overlayWorkbooksAsync(
      base,
      ov,
      {
        schema: {
          join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
          compose: {
            kind: 'rules',
            rules: [
              {
                op: 'add',
                base: 'Base Rate',
                overlay: 'Fuel Pct',
                target: 'T',
              },
            ],
          },
        },
      },
      {
        isCancelled: () => false,
        onProgress: () => {},
        chunkSize: 1,
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('OVERLAY_AMBIGUOUS_MATCH');
  });

  it('labels workbook without filename using fallback', () => {
    const unlabeled: Workbook = {
      sheets: [sheet('Rates', ['Vehicle Type', 'Base Rate'], [['Van', 1]])],
      activeSheetIndex: 0,
      meta: { format: 'csv' },
    };
    const result = overlayWorkbooks(unlabeled, unlabeled, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'add',
              base: 'Base Rate',
              overlay: 'Base Rate',
              target: 'T',
            },
          ],
        },
      },
    });
    // Ambiguous (self-join duplicates) or success — either exercises unlabeled path.
    expect(result.ok || result.error.code === 'OVERLAY_AMBIGUOUS_MATCH').toBe(true);
  });

  it('PARSE_ERROR when workbook has no sheets', () => {
    const emptyWb: Workbook = {
      sheets: [],
      activeSheetIndex: 0,
      meta: { format: 'csv', filename: 'empty.csv' },
    };
    const result = overlayWorkbooks(emptyWb, overlay, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'add',
              base: 'Base Rate',
              overlay: 'Fuel Pct',
              target: 'T',
            },
          ],
        },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('PARSE_ERROR');
  });

  it('worker rules path surfaces overlay engine errors', async () => {
    const ov = wb([
      sheet('S', ['Vehicle Type', 'Fuel Pct'], [
        ['Van', 1],
        ['Van', 2],
      ]),
    ]);
    const outcome = await overlayWorkbooksAsyncForWorker(base, ov, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'add',
              base: 'Base Rate',
              overlay: 'Fuel Pct',
              target: 'T',
            },
          ],
        },
      },
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error.code).toBe('OVERLAY_AMBIGUOUS_MATCH');
  });

  it('worker fn cancel after final chunk', async () => {
    let after = false;
    const outcome = await overlayWorkbooksAsyncForWorker(
      base,
      overlay,
      {
        schema: {
          join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
          compose: {
            kind: 'fn',
            fn: (r) => r,
          },
        },
      },
      {
        isCancelled: () => after,
        onProgress: () => {
          after = true;
        },
        chunkSize: 5000,
      },
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error.code).toBe('CANCELLED');
  });

  it('async fn empty base emits final progress', async () => {
    const empty = wb([sheet('Rates', ['Vehicle Type', 'Base Rate'], [])]);
    const events: Array<[number, number]> = [];
    const result = await overlayWorkbooksAsync(
      empty,
      overlay,
      {
        schema: {
          join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
          compose: {
            kind: 'fn',
            fn: (r) => r,
          },
        },
      },
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

  it('fn returning all nulls yields empty sheet with base headers', () => {
    const result = overlayWorkbooks(base, overlay, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'fn',
          fn: () => null,
        },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.summary.droppedByCompose).toBe(2);
    expect(result.value.workbook.sheets[0]!.rows).toEqual([]);
    expect(result.value.workbook.sheets[0]!.headers).toEqual([
      'Vehicle Type',
      'Base Rate',
      'Note',
    ]);
  });

  it('fn returning a single new key widens columns', () => {
    const result = overlayWorkbooks(base, overlay, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'fn',
          fn: (row) => ({ only: row['Vehicle Type'] }),
        },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.workbook.sheets[0]!.headers).toContain('only');
  });

  it('enforces workbook limits on base', () => {
    const result = overlayWorkbooks(base, overlay, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'add',
              base: 'Base Rate',
              overlay: 'Fuel Pct',
              target: 'T',
            },
          ],
        },
      },
      limits: { maxRows: 1 },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TOO_MANY_ROWS');
  });

  it('enforces workbook limits on overlay only', () => {
    const bigOverlay = wb([
      sheet('S', ['Vehicle Type', 'Fuel Pct'], [
        ['Van', 1],
        ['Truck', 2],
        ['Bike', 3],
      ]),
    ]);
    const result = overlayWorkbooks(base, bigOverlay, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'add',
              base: 'Base Rate',
              overlay: 'Fuel Pct',
              target: 'T',
            },
          ],
        },
      },
      limits: { maxRows: 2 },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TOO_MANY_ROWS');
  });

  it('resolves sheetName when both workbooks share the name', () => {
    const namedBase = wb([sheet('Shared', ['Vehicle Type', 'Base Rate'], [['Van', 10]])]);
    const namedOverlay = wb([
      sheet('Shared', ['Vehicle Type', 'Fuel Pct'], [['Van', 5]]),
    ]);
    const result = overlayWorkbooks(namedBase, namedOverlay, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'percentIncrease',
              base: 'Base Rate',
              overlay: 'Fuel Pct',
              target: 'Eff',
            },
          ],
        },
      },
      sheetName: 'Shared',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.workbook.sheets[0]!.rows[0]?.[2]).toBe(10.5);
  });

  it('sheet-not-found message uses unknown when filename omitted', () => {
    const unlabeled: Workbook = {
      sheets: [sheet('Rates', ['Vehicle Type', 'Base Rate'], [['Van', 1]])],
      activeSheetIndex: 0,
      meta: { format: 'csv' },
    };
    const result = overlayWorkbooks(unlabeled, unlabeled, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'add',
              base: 'Base Rate',
              overlay: 'Base Rate',
              target: 'T',
            },
          ],
        },
      },
      sheetName: 'Nope',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("'unknown'");
  });

  it('PARSE_ERROR without filename uses unknown label', () => {
    const emptyWb: Workbook = {
      sheets: [],
      activeSheetIndex: 0,
      meta: { format: 'csv' },
    };
    const result = overlayWorkbooks(emptyWb, overlay, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'add',
              base: 'Base Rate',
              overlay: 'Fuel Pct',
              target: 'T',
            },
          ],
        },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("'unknown'");
  });

  it('overlay sheet missing when base sheetName exists', () => {
    const namedBase = wb([sheet('Shared', ['Vehicle Type', 'Base Rate'], [['Van', 10]])]);
    const result = overlayWorkbooks(namedBase, overlay, {
      schema: {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'add',
              base: 'Base Rate',
              overlay: 'Fuel Pct',
              target: 'T',
            },
          ],
        },
      },
      sheetName: 'Shared',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_SCHEMA');
  });

  it('prepareOverlay validation failure via overlayWorkbooks', () => {
    const result = overlayWorkbooks(base, overlay, {
      schema: {
        join: { base: ['MissingCol'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'add',
              base: 'Base Rate',
              overlay: 'Fuel Pct',
              target: 'T',
            },
          ],
        },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_SCHEMA');
  });

  it('async prepareOverlay failure with control', async () => {
    const result = await overlayWorkbooksAsync(
      base,
      overlay,
      {
        schema: {
          join: { base: ['MissingCol'], overlay: ['Vehicle Type'] },
          compose: {
            kind: 'rules',
            rules: [
              {
                op: 'add',
                base: 'Base Rate',
                overlay: 'Fuel Pct',
                target: 'T',
              },
            ],
          },
        },
      },
      { isCancelled: () => false, onProgress: () => {} },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_SCHEMA');
  });

  it('async fn cancels at start of first chunk', async () => {
    const result = await overlayWorkbooksAsync(
      base,
      overlay,
      {
        schema: {
          join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
          compose: { kind: 'fn', fn: (r) => r },
        },
      },
      {
        isCancelled: () => true,
        onProgress: () => {},
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CANCELLED');
  });

  it('async fn counts unmatched base rows', async () => {
    const sparseOverlay = wb([
      sheet('S', ['Vehicle Type', 'Fuel Pct'], [['Van', 5]]),
    ]);
    const result = await overlayWorkbooksAsync(
      base,
      sparseOverlay,
      {
        schema: {
          join: {
            base: ['Vehicle Type'],
            overlay: ['Vehicle Type'],
            wildcardOnEmpty: 'none',
          },
          compose: { kind: 'fn', fn: (r) => r },
        },
      },
      { isCancelled: () => false, onProgress: () => {} },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.summary.unmatched).toBe(1);
    expect(result.value.summary.matched).toBe(1);
  });

  it('async fn cancel after pairs before assemble', async () => {
    let after = false;
    const result = await overlayWorkbooksAsync(
      base,
      overlay,
      {
        schema: {
          join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
          compose: { kind: 'fn', fn: (r) => r },
        },
      },
      {
        isCancelled: () => after,
        onProgress: () => {
          after = true;
        },
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CANCELLED');
  });

  it('worker fn prepareOverlay failure with control', async () => {
    const outcome = await overlayWorkbooksAsyncForWorker(
      base,
      overlay,
      {
        schema: {
          join: { base: ['Nope'], overlay: ['Vehicle Type'] },
          compose: { kind: 'fn', fn: (r) => r },
        },
      },
      { isCancelled: () => false, onProgress: () => {} },
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error.code).toBe('INVALID_SCHEMA');
  });

  it('worker fn path counts unmatched rows', async () => {
    const sparseOverlay = wb([
      sheet('S', ['Vehicle Type', 'Fuel Pct'], [['Van', 5]]),
    ]);
    const outcome = await overlayWorkbooksAsyncForWorker(
      base,
      sparseOverlay,
      {
        schema: {
          join: {
            base: ['Vehicle Type'],
            overlay: ['Vehicle Type'],
            wildcardOnEmpty: 'none',
          },
          compose: { kind: 'fn', fn: (r) => r },
        },
      },
      { isCancelled: () => false, onProgress: () => {} },
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    if (outcome.value.kind !== 'fn-pairs') return;
    expect(outcome.value.value.summary.unmatched).toBe(1);
  });
});
