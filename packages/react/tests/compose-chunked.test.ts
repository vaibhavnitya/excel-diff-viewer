import { describe, expect, it, vi } from 'vitest';
import {
  createFnSlowWarning,
  runComposeChunked,
} from '../src/overlay/compose-chunked.js';
import type { MatchedPair } from '@mojro/excel-diff-core';

describe('runComposeChunked', () => {
  const pairs: MatchedPair[] = [
    { baseRow: ['Van', 100], overlayRows: [['Van', 5]], baseRowIndex: 0 },
    { baseRow: ['Bike', 40], overlayRows: [], baseRowIndex: 1 },
  ];

  it('builds workbook and drops null returns', async () => {
    const result = await runComposeChunked(
      pairs,
      (row, rows) => {
        if (row['Vehicle Type'] === 'Bike') return null;
        return { ...row, n: rows.length };
      },
      ['Vehicle Type', 'Base Rate'],
      ['Vehicle Type', 'Fuel Pct'],
      'Rates',
      'base.csv',
      {
        totalBase: 2,
        totalOverlay: 1,
        matched: 1,
        unmatched: 1,
      },
      {
        isCancelled: () => false,
        onProgress: () => {},
        chunkSize: 1,
      },
    );
    expect(result).not.toBeNull();
    expect(result!.summary.droppedByCompose).toBe(1);
    expect(result!.workbook.sheets[0]!.rows).toHaveLength(1);
  });

  it('returns null when cancelled between chunks', async () => {
    let checks = 0;
    const result = await runComposeChunked(
      pairs,
      (row) => row,
      ['Vehicle Type', 'Base Rate'],
      ['Vehicle Type', 'Fuel Pct'],
      'Rates',
      undefined,
      {
        totalBase: 2,
        totalOverlay: 1,
        matched: 1,
        unmatched: 1,
      },
      {
        isCancelled: () => {
          checks += 1;
          return checks > 1;
        },
        onProgress: () => {},
        chunkSize: 1,
      },
    );
    expect(result).toBeNull();
  });
});

describe('createFnSlowWarning', () => {
  it('warns once when average exceeds 1ms in development', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fired = { current: false };
    const slow = createFnSlowWarning(
      () => {
        const start = Date.now();
        while (Date.now() - start < 2) {
          /* busy */
        }
        return { x: 1 };
      },
      100,
      fired,
    );
    for (let i = 0; i < 100; i += 1) {
      slow({}, []);
    }
    expect(warn).toHaveBeenCalledTimes(1);
    expect(fired.current).toBe(true);
    warn.mockRestore();
    process.env.NODE_ENV = prev;
  });

  it('does not wrap in production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const fn = (row: Record<string, unknown>) => row as never;
    const fired = { current: false };
    const wrapped = createFnSlowWarning(fn as never, 100, fired);
    expect(wrapped).toBe(fn);
    process.env.NODE_ENV = prev;
  });
});
