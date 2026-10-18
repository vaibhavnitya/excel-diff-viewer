import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDiffError,
  createWorker,
  type OverlayWorkbooksOptions,
  type WorkerClient,
} from '@mojro/excel-diff-core';
import { useExcelOverlay } from '../src/use-excel-overlay.js';
import { FakeWorkerClient } from './mocks/fake-worker-client.js';

vi.mock('@mojro/excel-diff-core', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@mojro/excel-diff-core')>();
  return {
    ...actual,
    createWorker: vi.fn((): WorkerClient =>
      new FakeWorkerClient() as unknown as WorkerClient,
    ),
  };
});

function buffer(label: string): ArrayBuffer {
  return new TextEncoder().encode(label).buffer;
}

const rulesOptions: OverlayWorkbooksOptions = {
  schema: {
    join: { base: ['origin'], overlay: ['origin'] },
    compose: {
      kind: 'rules',
      rules: [
        {
          op: 'add',
          base: 'rate',
          overlay: 'rate',
          target: 'total',
        },
      ],
    },
  },
};

describe('useExcelOverlay', () => {
  const base = buffer('base');
  const overlay = buffer('overlay');

  beforeEach(() => {
    FakeWorkerClient.reset();
    vi.mocked(createWorker).mockImplementation(
      () => new FakeWorkerClient() as unknown as WorkerClient,
    );
  });

  it('surfaces WORKER_UNAVAILABLE', () => {
    vi.mocked(createWorker).mockImplementationOnce(() => {
      throw createDiffError(
        'WORKER_UNAVAILABLE',
        'Web Workers are not available in this environment.',
      );
    });
    const { result } = renderHook(() =>
      useExcelOverlay(base, overlay, rulesOptions),
    );
    expect(result.current.status).toBe('error');
    if (result.current.status !== 'error') throw new Error('expected error');
    expect(result.current.error.code).toBe('WORKER_UNAVAILABLE');
  });

  it('returns workbook for rules compose', async () => {
    const { result } = renderHook(() =>
      useExcelOverlay(base, overlay, rulesOptions),
    );
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    if (result.current.status !== 'success') throw new Error('expected success');
    expect(result.current.workbook).toBeDefined();
    expect(result.current.summary.matched).toBe(1);
    expect(result.current.workbookBase).toBeDefined();
    expect(result.current.workbookOverlay).toBeDefined();
  });

  it('runs fn compose on main thread with progress crossing 50%', async () => {
    FakeWorkerClient.nextOverlayHandler = async () => ({
      ok: true as const,
      value: {
        kind: 'fn-pairs' as const,
        pairs: [
          { baseRow: ['us', 1], overlayRows: [['us', 2]], baseRowIndex: 0 },
          { baseRow: ['uk', 3], overlayRows: [], baseRowIndex: 1 },
        ],
        baseHeaders: ['origin', 'rate'],
        overlayHeaders: ['origin', 'rate'],
        summary: {
          totalBase: 2,
          totalOverlay: 1,
          matched: 1,
          unmatched: 1,
        },
        sheetName: 'Sheet1',
        baseFilename: 'base.xlsx',
      },
    });

    const fnOptions: OverlayWorkbooksOptions = {
      schema: {
        join: { base: ['origin'], overlay: ['origin'] },
        compose: {
          kind: 'fn',
          fn: (row, rows) => ({ ...row, n: rows.length }),
        },
      },
    };

    const { result } = renderHook(() =>
      useExcelOverlay(base, overlay, fnOptions),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    if (result.current.status !== 'success') throw new Error('expected success');
    expect(result.current.workbook.sheets[0]!.headers).toContain('n');
    expect(result.current.summary.droppedByCompose).toBe(0);
  });

  it('stays idle when options is null', () => {
    const { result } = renderHook(() => useExcelOverlay(base, overlay, null));
    expect(result.current.status).toBe('idle');
  });

  it('cancels on unmount mid-compose', async () => {
    FakeWorkerClient.nextOverlayHandler = () =>
      new Promise(() => {
        /* never resolve */
      });

    const { unmount } = renderHook(() =>
      useExcelOverlay(base, overlay, rulesOptions),
    );
    await waitFor(() => {
      expect(FakeWorkerClient.latest()?.overlayCalls ?? 0).toBeGreaterThan(0);
    });
    unmount();
    expect(FakeWorkerClient.latest()?.cancelCalls).toBeGreaterThan(0);
  });
});
