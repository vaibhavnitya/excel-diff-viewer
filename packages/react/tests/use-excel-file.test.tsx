import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDiffError,
  createWorker,
  err,
  ok,
  type WorkerClient,
} from '@your-scope/excel-diff-core';
import { useExcelFile } from '../src/use-excel-file.js';
import {
  FakeWorkerClient,
  defaultWorkbook,
} from './mocks/fake-worker-client.js';

vi.mock('@your-scope/excel-diff-core', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@your-scope/excel-diff-core')>();
  return {
    ...actual,
    createWorker: vi.fn((): WorkerClient =>
      new FakeWorkerClient() as unknown as WorkerClient,
    ),
  };
});

function buffer(label = 'a.xlsx'): ArrayBuffer {
  return new TextEncoder().encode(label).buffer;
}

describe('useExcelFile', () => {
  beforeEach(() => {
    FakeWorkerClient.reset();
    vi.mocked(createWorker).mockImplementation(
      () => new FakeWorkerClient() as unknown as WorkerClient,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('surfaces Worker construction failure as WORKER_UNAVAILABLE', () => {
    vi.mocked(createWorker).mockImplementationOnce(() => {
      throw createDiffError(
        'WORKER_UNAVAILABLE',
        'Web Workers are not available in this environment.',
      );
    });

    const file = buffer();
    const { result } = renderHook(({ file: f }) => useExcelFile(f), {
      initialProps: { file: file as ArrayBuffer | null },
    });

    expect(result.current.status).toBe('error');
    if (result.current.status !== 'error') {
      throw new Error('expected error');
    }
    expect(result.current.error.code).toBe('WORKER_UNAVAILABLE');
  });

  it('transitions idle → loading → success for a valid file', async () => {
    const file = buffer();
    const { result } = renderHook(({ file: f }) => useExcelFile(f), {
      initialProps: { file: file as ArrayBuffer | null },
    });

    expect(result.current.status).toBe('loading');

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    if (result.current.status !== 'success') {
      throw new Error('expected success');
    }
    expect(result.current.workbook.meta.filename).toBe('parsed.xlsx');
  });

  it('transitions idle → loading → error for a corrupt file', async () => {
    FakeWorkerClient.nextParseHandler = async () =>
      err(createDiffError('PARSE_ERROR', 'File is corrupt.'));

    const file = buffer();
    const { result } = renderHook(({ file: f }) => useExcelFile(f), {
      initialProps: { file: file as ArrayBuffer | null },
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    if (result.current.status !== 'error') {
      throw new Error('expected error');
    }
    expect(result.current.error.code).toBe('PARSE_ERROR');
  });

  it('cancels and restarts when the file prop changes mid-load', async () => {
    let firstResolver:
      | ((value: ReturnType<typeof ok<ReturnType<typeof defaultWorkbook>>>) => void)
      | null = null;
    let parseCount = 0;

    FakeWorkerClient.nextParseHandler = () => {
      parseCount += 1;
      if (parseCount === 1) {
        return new Promise((resolve) => {
          firstResolver = resolve;
        });
      }
      return ok(defaultWorkbook('second.xlsx'));
    };

    const first = buffer('first');
    const second = buffer('second');

    const { result, rerender } = renderHook(
      ({ file }) => useExcelFile(file),
      { initialProps: { file: first as ArrayBuffer | null } },
    );

    await waitFor(() => {
      expect(parseCount).toBe(1);
      expect(firstResolver).not.toBeNull();
    });
    expect(result.current.status).toBe('loading');

    const client = FakeWorkerClient.latest()!;
    client.parseHandler = () => {
      parseCount += 1;
      return ok(defaultWorkbook('second.xlsx'));
    };

    rerender({ file: second });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    if (result.current.status !== 'success') {
      throw new Error('expected success');
    }
    expect(result.current.workbook.meta.filename).toBe('second.xlsx');

    await act(async () => {
      firstResolver?.(ok(defaultWorkbook('first.xlsx')));
    });

    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.workbook.meta.filename).toBe('second.xlsx');
    }
  });

  it('terminates its Worker on unmount', async () => {
    const file = buffer();
    const { result, unmount } = renderHook(() => useExcelFile(file));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    const client = FakeWorkerClient.latest();
    expect(client).toBeDefined();
    expect(client!.terminated).toBe(false);

    unmount();

    expect(client!.terminated).toBe(true);
    expect(client!.terminateCalls).toBeGreaterThanOrEqual(1);
  });

  it('survives StrictMode double-invocation without leaked Workers or stuck loading', async () => {
    const file = buffer();
    const { result, unmount } = renderHook(() => useExcelFile(file), {
      wrapper: StrictMode,
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(FakeWorkerClient.liveCount).toBe(1);

    unmount();

    expect(FakeWorkerClient.liveCount).toBe(0);
  });

  it('throttles progress so 100 rapid events do not cause 100 renders', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    let renderCount = 0;
    const file = buffer();

    FakeWorkerClient.nextParseHandler = async () => {
      await Promise.resolve();
      const client = FakeWorkerClient.latest()!;
      for (let i = 1; i <= 100; i += 1) {
        client.emitProgress(Math.min(99, i));
      }
      return ok(defaultWorkbook());
    };

    const { result } = renderHook(() => {
      renderCount += 1;
      return useExcelFile(file);
    });

    await act(async () => {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(600);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(renderCount).toBeLessThan(40);
  });
});
