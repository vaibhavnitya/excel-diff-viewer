import { useEffect, useState } from 'react';
import type { DiffSchema } from '@your-scope/excel-diff-core';
import {
  createProgressThrottle,
  type ProgressThrottle,
} from './internal/progress-throttle.js';
import { resolveFilename, toArrayBuffer } from './internal/to-array-buffer.js';
import { useWorkerClient } from './internal/use-worker-client.js';
import type { DiffPhase, DiffState, UseExcelDiffOptions } from './types.js';

/**
 * Parse two files and diff them on a dedicated Worker.
 * Stays idle while any of `fileA`, `fileB`, or `schema` is null.
 */
export function useExcelDiff(
  fileA: File | ArrayBuffer | null,
  fileB: File | ArrayBuffer | null,
  schema: DiffSchema | null,
  options?: UseExcelDiffOptions,
): DiffState {
  const [state, setState] = useState<DiffState>({ status: 'idle' });
  const { getClient, generationRef } = useWorkerClient();

  const filenameA = options?.filenameA;
  const filenameB = options?.filenameB;
  const formatA = options?.formatA;
  const formatB = options?.formatB;
  const limits = options?.limits;

  useEffect(() => {
    if (fileA === null || fileB === null || schema === null) {
      setState({ status: 'idle' });
      return;
    }

    const runId = ++generationRef.current;
    const client = getClient();

    let phase: DiffPhase = 'parsing-a';
    let throttle: ProgressThrottle = createProgressThrottle((pct) => {
      if (runId !== generationRef.current) {
        return;
      }
      setState({ status: 'loading', progress: pct, phase });
    });

    const beginPhase = (next: DiffPhase): void => {
      phase = next;
      throttle.cancel();
      throttle = createProgressThrottle((pct) => {
        if (runId !== generationRef.current) {
          return;
        }
        setState({ status: 'loading', progress: pct, phase });
      });
      setState({ status: 'loading', progress: 0, phase });
    };

    beginPhase('parsing-a');

    const unsubscribe = client.onProgress((progress) => {
      if (runId !== generationRef.current) {
        return;
      }
      throttle.push(progress.pct);
    });

    void (async () => {
      try {
        const bufferA = await toArrayBuffer(fileA);
        if (runId !== generationRef.current) {
          return;
        }

        const parsedA = await client.parse(bufferA, {
          filename: resolveFilename(fileA, filenameA),
          format: formatA,
          limits,
        });
        if (runId !== generationRef.current) {
          return;
        }
        if (!parsedA.ok) {
          if (parsedA.error.code === 'CANCELLED') {
            return;
          }
          throttle.cancel();
          setState({ status: 'error', error: parsedA.error });
          return;
        }
        throttle.push(100);

        beginPhase('parsing-b');
        const bufferB = await toArrayBuffer(fileB);
        if (runId !== generationRef.current) {
          return;
        }

        const parsedB = await client.parse(bufferB, {
          filename: resolveFilename(fileB, filenameB),
          format: formatB,
          limits,
        });
        if (runId !== generationRef.current) {
          return;
        }
        if (!parsedB.ok) {
          if (parsedB.error.code === 'CANCELLED') {
            return;
          }
          throttle.cancel();
          setState({ status: 'error', error: parsedB.error });
          return;
        }
        throttle.push(100);

        beginPhase('diffing');
        const diffed = await client.diff(parsedA.value, parsedB.value, schema);
        if (runId !== generationRef.current) {
          return;
        }
        if (!diffed.ok) {
          if (diffed.error.code === 'CANCELLED') {
            return;
          }
          throttle.cancel();
          setState({ status: 'error', error: diffed.error });
          return;
        }

        throttle.push(100);
        setState({
          status: 'success',
          diff: diffed.value,
          workbookA: parsedA.value,
          workbookB: parsedB.value,
        });
      } catch (cause) {
        if (runId !== generationRef.current) {
          return;
        }
        throttle.cancel();
        setState({
          status: 'error',
          error: {
            code: 'PARSE_ERROR',
            message:
              cause instanceof Error
                ? cause.message
                : 'Failed to read or diff files.',
            details: { cause: String(cause) },
          },
        });
      }
    })();

    return () => {
      generationRef.current += 1;
      throttle.cancel();
      unsubscribe();
      client.cancel();
    };
  }, [
    fileA,
    fileB,
    schema,
    filenameA,
    filenameB,
    formatA,
    formatB,
    limits,
    getClient,
    generationRef,
  ]);

  return state;
}
