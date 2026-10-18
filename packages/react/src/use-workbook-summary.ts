import {
  createSummaryCache,
  summarizeWorkbook,
  summarizeWorkbookAsync,
  type SummaryCache,
  type SummaryConfig,
  type Workbook,
} from '@mojro/excel-diff-core';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  UseWorkbookSummaryOptions,
  UseWorkbookSummaryState,
} from './types.js';

/**
 * Summarize a parsed {@link Workbook} with optional config and cache.
 *
 * Stays `idle` while `workbook` is `null`. Default execution is **sync** via
 * `summarizeWorkbook` (comfortable through the 100k-row / ~500ms budget). Pass
 * `options.async: true` for chunked `summarizeWorkbookAsync` with progress and
 * cancellation on workbook change or unmount.
 *
 * Cache: pass `options.cache` to share across hooks; otherwise an internal
 * cache is created per hook instance and discarded on unmount.
 */
export function useWorkbookSummary(
  workbook: Workbook | null,
  config?: SummaryConfig,
  options?: UseWorkbookSummaryOptions,
): UseWorkbookSummaryState {
  const externalCache = options?.cache;
  const isAsync = options?.async === true;

  const internalCacheRef = useRef<SummaryCache | null>(null);
  if (internalCacheRef.current === null) {
    internalCacheRef.current = createSummaryCache();
  }
  const cache = externalCache ?? internalCacheRef.current;

  const syncState = useMemo((): UseWorkbookSummaryState | null => {
    if (isAsync) {
      return null;
    }
    if (workbook === null) {
      return { status: 'idle' };
    }
    const result = summarizeWorkbook(workbook, config, cache);
    if (!result.ok) {
      return { status: 'error', error: result.error };
    }
    return { status: 'success', summary: result.value };
  }, [isAsync, workbook, config, cache]);

  const [asyncState, setAsyncState] = useState<UseWorkbookSummaryState>({
    status: 'idle',
  });
  const generationRef = useRef(0);

  useEffect(() => {
    if (!isAsync) {
      return;
    }

    if (workbook === null) {
      setAsyncState({ status: 'idle' });
      return;
    }

    const runId = ++generationRef.current;
    let cancelled = false;

    setAsyncState({
      status: 'loading',
      progress: { processed: 0, total: 0 },
    });

    void (async () => {
      const result = await summarizeWorkbookAsync(workbook, config, cache, {
        isCancelled: () => cancelled || runId !== generationRef.current,
        onProgress: (processed, total) => {
          if (cancelled || runId !== generationRef.current) {
            return;
          }
          setAsyncState({
            status: 'loading',
            progress: { processed, total },
          });
        },
      });

      if (cancelled || runId !== generationRef.current) {
        return;
      }

      if (!result.ok) {
        if (result.error.code === 'CANCELLED') {
          return;
        }
        setAsyncState({ status: 'error', error: result.error });
        return;
      }

      setAsyncState({ status: 'success', summary: result.value });
    })();

    return () => {
      cancelled = true;
      generationRef.current += 1;
    };
  }, [isAsync, workbook, config, cache]);

  if (isAsync) {
    return asyncState;
  }
  // syncState is non-null whenever !isAsync
  return syncState!;
}
