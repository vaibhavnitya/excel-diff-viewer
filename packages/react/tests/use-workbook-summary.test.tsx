import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSummaryCache,
  summarizeWorkbook,
  summarizeWorkbookAsync,
  type SummaryConfig,
  type Workbook,
} from '@mojro/excel-diff-core';
import { useWorkbookSummary } from '../src/use-workbook-summary.js';

vi.mock('@mojro/excel-diff-core', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@mojro/excel-diff-core')>();
  return {
    ...actual,
    summarizeWorkbook: vi.fn(actual.summarizeWorkbook),
    summarizeWorkbookAsync: vi.fn(actual.summarizeWorkbookAsync),
  };
});

async function realCore(): Promise<typeof import('@mojro/excel-diff-core')> {
  return vi.importActual<typeof import('@mojro/excel-diff-core')>(
    '@mojro/excel-diff-core',
  );
}

function wb(
  headers: readonly string[],
  rows: readonly (readonly (string | number | boolean | null)[])[],
): Workbook {
  return {
    sheets: [{ name: 'Sheet1', headers, rows }],
    activeSheetIndex: 0,
    meta: { format: 'csv', filename: 't.csv' },
  };
}

describe('useWorkbookSummary', () => {
  const workbook = wb(
    ['n', 'c'],
    [
      [1, 'a'],
      [2, 'b'],
      [3, 'a'],
    ],
  );

  beforeEach(async () => {
    const actual = await realCore();
    vi.mocked(summarizeWorkbook).mockImplementation(actual.summarizeWorkbook);
    vi.mocked(summarizeWorkbookAsync).mockImplementation(
      actual.summarizeWorkbookAsync,
    );
  });

  it('returns correct summary for a given workbook (sync)', () => {
    const { result } = renderHook(() => useWorkbookSummary(workbook));

    expect(result.current.status).toBe('success');
    if (result.current.status !== 'success') {
      throw new Error('expected success');
    }
    expect(result.current.summary.rowCount).toBe(3);
    expect(result.current.summary.columns).toHaveLength(2);
    expect(result.current.summary.columns[0]).toMatchObject({
      treatment: 'numeric',
      mean: 2,
    });
  });

  it('returns correct summary for a given workbook (async)', async () => {
    const { result } = renderHook(() =>
      useWorkbookSummary(workbook, undefined, { async: true }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    if (result.current.status !== 'success') {
      throw new Error('expected success');
    }
    expect(result.current.summary.columns[0]).toMatchObject({
      treatment: 'numeric',
      mean: 2,
    });
  });

  it('cache hit on same (workbook, config, cache) references', () => {
    const cache = createSummaryCache();
    const config: SummaryConfig = { topN: 5 };

    const first = summarizeWorkbook(workbook, config, cache);
    expect(first.ok).toBe(true);

    const { result } = renderHook(() =>
      useWorkbookSummary(workbook, config, { cache }),
    );

    expect(result.current.status).toBe('success');
    if (result.current.status !== 'success' || !first.ok) {
      throw new Error('expected success');
    }
    expect(result.current.summary).toBe(first.value);
  });

  it('cache miss on different config references with same shape', () => {
    const cache = createSummaryCache();
    const configA: SummaryConfig = { topN: 5 };
    const configB: SummaryConfig = { topN: 5 };

    const { result, rerender } = renderHook(
      ({ cfg }) => useWorkbookSummary(workbook, cfg, { cache }),
      { initialProps: { cfg: configA } },
    );

    expect(result.current.status).toBe('success');
    if (result.current.status !== 'success') {
      throw new Error('expected success');
    }
    const firstSummary = result.current.summary;

    rerender({ cfg: configB });

    expect(result.current.status).toBe('success');
    if (result.current.status !== 'success') {
      throw new Error('expected success');
    }
    expect(result.current.summary).not.toBe(firstSummary);
    expect(result.current.summary.columns).toHaveLength(
      firstSummary.columns.length,
    );
  });

  it('no external cache → internal cache created and used', () => {
    const { result, rerender } = renderHook(
      ({ w }) => useWorkbookSummary(w),
      { initialProps: { w: workbook as Workbook | null } },
    );

    expect(result.current.status).toBe('success');
    if (result.current.status !== 'success') {
      throw new Error('expected success');
    }
    const first = result.current.summary;

    rerender({ w: workbook });
    expect(result.current.status).toBe('success');
    if (result.current.status !== 'success') {
      throw new Error('expected success');
    }
    expect(result.current.summary).toBe(first);
  });

  it('external cache → used, not replaced', () => {
    const cache = createSummaryCache();
    const seeded = summarizeWorkbook(workbook, undefined, cache);
    expect(seeded.ok).toBe(true);

    const { result } = renderHook(() =>
      useWorkbookSummary(workbook, undefined, { cache }),
    );

    expect(result.current.status).toBe('success');
    if (result.current.status !== 'success' || !seeded.ok) {
      throw new Error('expected success');
    }
    expect(result.current.summary).toBe(seeded.value);
  });

  it('workbook: null → idle state, no summarize call made', () => {
    vi.mocked(summarizeWorkbook).mockClear();

    const { result } = renderHook(() => useWorkbookSummary(null));

    expect(result.current.status).toBe('idle');
    expect(vi.mocked(summarizeWorkbook)).not.toHaveBeenCalled();
  });

  it('config changes → re-summarize', () => {
    const configA: SummaryConfig = { exclude: ['c'] };
    const configB: SummaryConfig = { exclude: ['n'] };

    const { result, rerender } = renderHook(
      ({ cfg }) => useWorkbookSummary(workbook, cfg),
      { initialProps: { cfg: configA } },
    );

    expect(result.current.status).toBe('success');
    if (result.current.status !== 'success') {
      throw new Error('expected success');
    }
    expect(result.current.summary.columns.map((c) => c.column)).toEqual(['n']);

    rerender({ cfg: configB });

    expect(result.current.status).toBe('success');
    if (result.current.status !== 'success') {
      throw new Error('expected success');
    }
    expect(result.current.summary.columns.map((c) => c.column)).toEqual(['c']);
  });

  it('async: cancellation on workbook change mid-compute', async () => {
    const slow = wb(['n'], [[1], [2]]);
    const fast = wb(
      ['n'],
      [
        [10],
        [20],
        [30],
      ],
    );

    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    vi.mocked(summarizeWorkbookAsync).mockImplementation(
      async (wbArg, cfg, cacheArg, control) => {
        if (wbArg === slow) {
          control?.onProgress(0, 2);
          await firstGate;
          if (control?.isCancelled()) {
            return {
              ok: false as const,
              error: {
                code: 'CANCELLED' as const,
                message: 'Summary was cancelled before completion.',
              },
            };
          }
        }
        const actual = await realCore();
        return actual.summarizeWorkbookAsync(wbArg, cfg, cacheArg, control);
      },
    );

    const { result, rerender } = renderHook(
      ({ w }) => useWorkbookSummary(w, undefined, { async: true }),
      { initialProps: { w: slow as Workbook | null } },
    );

    await waitFor(() => {
      expect(result.current.status).toBe('loading');
    });

    rerender({ w: fast });
    await act(async () => {
      releaseFirst?.();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    if (result.current.status !== 'success') {
      throw new Error('expected success');
    }
    expect(result.current.summary.columns[0]).toMatchObject({
      treatment: 'numeric',
      mean: 20,
    });
  });

  it('async: cancellation on unmount', async () => {
    let sawCancelled = false;

    vi.mocked(summarizeWorkbookAsync).mockImplementation(
      async (_wb, _cfg, _cache, control) => {
        await new Promise((r) => setTimeout(r, 40));
        if (control?.isCancelled()) {
          sawCancelled = true;
          return {
            ok: false as const,
            error: {
              code: 'CANCELLED' as const,
              message: 'Summary was cancelled before completion.',
            },
          };
        }
        return {
          ok: true as const,
          value: {
            sheetName: 'Sheet1',
            rowCount: 0,
            columnCount: 0,
            columns: [],
            skippedColumns: [],
            warnings: [],
          },
        };
      },
    );

    const { unmount } = renderHook(() =>
      useWorkbookSummary(workbook, undefined, { async: true }),
    );

    unmount();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(sawCancelled).toBe(true);
  });

  it('async: progress fires including final (total, total)', async () => {
    const progressEvents: { processed: number; total: number }[] = [];

    const { result } = renderHook(() =>
      useWorkbookSummary(workbook, undefined, { async: true }),
    );

    await waitFor(() => {
      if (result.current.status === 'loading') {
        progressEvents.push({ ...result.current.progress });
      }
      expect(result.current.status).toBe('success');
    });

    expect(progressEvents.length).toBeGreaterThan(0);
    const last = progressEvents[progressEvents.length - 1]!;
    expect(last.processed).toBe(last.total);
    expect(last.total).toBeGreaterThan(0);
  });

  it('error from engine propagates to hook state with correct code', () => {
    const badConfig: SummaryConfig = {
      columns: { 'missing-col': 'numeric' },
    };

    const { result } = renderHook(() =>
      useWorkbookSummary(workbook, badConfig),
    );

    expect(result.current.status).toBe('error');
    if (result.current.status !== 'error') {
      throw new Error('expected error');
    }
    expect(result.current.error.code).toBe('SUMMARY_COLUMN_NOT_FOUND');
  });
});
