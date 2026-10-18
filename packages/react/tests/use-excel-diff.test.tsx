import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDiffError,
  createWorker,
  type DiffSchema,
  type WorkerClient,
} from '@mojro/excel-diff-core';
import { useExcelDiff } from '../src/use-excel-diff.js';
import {
  FakeWorkerClient,
  defaultSchema,
  defaultWorkbook,
} from './mocks/fake-worker-client.js';

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

describe('useExcelDiff', () => {
  const fileA = buffer('a');
  const fileB = buffer('b');
  const schema = defaultSchema();

  beforeEach(() => {
    FakeWorkerClient.reset();
    vi.mocked(createWorker).mockImplementation(
      () => new FakeWorkerClient() as unknown as WorkerClient,
    );
  });

  it('surfaces Worker construction failure as WORKER_UNAVAILABLE', () => {
    vi.mocked(createWorker).mockImplementationOnce(() => {
      throw createDiffError(
        'WORKER_UNAVAILABLE',
        'Web Workers are not available in this environment.',
      );
    });

    const { result } = renderHook(() => useExcelDiff(fileA, fileB, schema));

    expect(result.current.status).toBe('error');
    if (result.current.status !== 'error') {
      throw new Error('expected error');
    }
    expect(result.current.error.code).toBe('WORKER_UNAVAILABLE');
  });

  it('transitions idle → loading → success for the diff flow', async () => {
    const { result } = renderHook(
      ({ a, b, s }) => useExcelDiff(a, b, s),
      {
        initialProps: {
          a: fileA as ArrayBuffer | null,
          b: fileB as ArrayBuffer | null,
          s: schema as DiffSchema | null,
        },
      },
    );

    expect(result.current.status).toBe('loading');

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    if (result.current.status !== 'success') {
      throw new Error('expected success');
    }
    expect(result.current.diff.stats.unchanged).toBe(0);
    expect(result.current.workbookA).toBeDefined();
    expect(result.current.workbookB).toBeDefined();
  });

  it('phase progresses parsing-a → parsing-b → diffing', async () => {
    const phases = new Set<string>();
    let parseN = 0;

    FakeWorkerClient.nextParseHandler = async () => {
      parseN += 1;
      await new Promise((r) => setTimeout(r, 30));
      return {
        ok: true as const,
        value: defaultWorkbook(parseN === 1 ? 'a.xlsx' : 'b.xlsx'),
      };
    };
    FakeWorkerClient.nextDiffHandler = async () => {
      await new Promise((r) => setTimeout(r, 30));
      return {
        ok: true as const,
        value: {
          headers: ['origin', 'rate'],
          rows: [],
          stats: { added: 0, removed: 0, modified: 0, unchanged: 1 },
          summary: {
            totalKeys: 1,
            added: 0,
            removed: 0,
            modified: 0,
            unchanged: 1,
            fieldChanges: [],
            warnings: [],
          },
        },
      };
    };

    const { result } = renderHook(() =>
      useExcelDiff(fileA, fileB, schema),
    );

    await waitFor(
      () => {
        if (result.current.status === 'loading') {
          phases.add(result.current.phase);
        }
        expect(result.current.status).toBe('success');
      },
      { interval: 5, timeout: 3000 },
    );

    expect([...phases]).toEqual(['parsing-a', 'parsing-b', 'diffing']);
  });

  it('stays idle when schema is null until schema is provided', async () => {
    const { result, rerender } = renderHook(
      ({ s }) => useExcelDiff(fileA, fileB, s),
      { initialProps: { s: null as DiffSchema | null } },
    );

    expect(result.current.status).toBe('idle');
    expect(FakeWorkerClient.instances.length).toBe(0);

    rerender({ s: schema });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
  });

  it('stays idle when fileA or fileB is null', async () => {
    const { result, rerender } = renderHook(
      ({ a, b }) => useExcelDiff(a, b, schema),
      {
        initialProps: {
          a: null as ArrayBuffer | null,
          b: fileB as ArrayBuffer | null,
        },
      },
    );

    expect(result.current.status).toBe('idle');

    rerender({ a: fileA, b: null });
    expect(result.current.status).toBe('idle');

    rerender({ a: fileA, b: fileB });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
  });
});
