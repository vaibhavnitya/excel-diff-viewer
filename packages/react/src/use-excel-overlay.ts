import { useEffect, useRef, useState } from 'react';
import {
  type OverlayWorkbooksOptions,
  type WorkerClient,
} from '@mojro/excel-diff-core';
import {
  createProgressThrottle,
  type ProgressThrottle,
} from './internal/progress-throttle.js';
import { resolveFilename, toArrayBuffer } from './internal/to-array-buffer.js';
import { toWorkerUnavailableError } from './internal/to-worker-unavailable-error.js';
import { useWorkerClient } from './internal/use-worker-client.js';
import {
  createFnSlowWarning,
  runComposeChunked,
} from './overlay/compose-chunked.js';
import type {
  OverlayPhase,
  OverlayState,
  UseExcelOverlayOptions,
} from './types.js';

/**
 * Parse a base + overlay file and compose them on a dedicated Worker.
 *
 * Progress combines Worker overlay work (0–50%) with main-thread `fn` compose
 * (50–100%) when `options.schema.compose.kind === 'fn'`. For `rules` compose,
 * progress is entirely Worker-side (0–100%).
 *
 * Stays idle while any of `baseFile`, `overlayFile`, or `options` is null.
 */
export function useExcelOverlay(
  baseFile: File | ArrayBuffer | null,
  overlayFile: File | ArrayBuffer | null,
  options: OverlayWorkbooksOptions | null,
  hookOptions?: UseExcelOverlayOptions,
): OverlayState {
  const [state, setState] = useState<OverlayState>({ status: 'idle' });
  const { getClient, generationRef } = useWorkerClient();
  const slowWarnFiredRef = useRef(false);

  const filenameBase = hookOptions?.filenameBase;
  const filenameOverlay = hookOptions?.filenameOverlay;
  const formatBase = hookOptions?.formatBase;
  const formatOverlay = hookOptions?.formatOverlay;
  const limits = hookOptions?.limits ?? options?.limits;

  useEffect(() => {
    if (baseFile === null || overlayFile === null || options === null) {
      setState({ status: 'idle' });
      return;
    }

    const runId = ++generationRef.current;

    let client: WorkerClient;
    try {
      client = getClient();
    } catch (cause) {
      setState({ status: 'error', error: toWorkerUnavailableError(cause) });
      return;
    }

    let phase: OverlayPhase = 'parsing-base';
    let throttle: ProgressThrottle = createProgressThrottle((pct) => {
      if (runId !== generationRef.current) {
        return;
      }
      setState({ status: 'loading', progress: pct, phase });
    });

    const beginPhase = (next: OverlayPhase): void => {
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

    beginPhase('parsing-base');

    const unsubscribe = client.onProgress((progress) => {
      if (runId !== generationRef.current) {
        return;
      }
      // Worker progress maps to 0–50 when fn compose will follow; else 0–100.
      if (options.schema.compose.kind === 'fn' && phase === 'overlaying') {
        throttle.push(Math.round(progress.pct * 0.5));
      } else {
        throttle.push(progress.pct);
      }
    });

    let cancelled = false;

    void (async () => {
      try {
        const bufferBase = await toArrayBuffer(baseFile);
        if (runId !== generationRef.current) {
          return;
        }

        const parsedBase = await client.parse(bufferBase, {
          filename: resolveFilename(baseFile, filenameBase),
          format: formatBase,
          limits,
        });
        if (runId !== generationRef.current) {
          return;
        }
        if (!parsedBase.ok) {
          if (parsedBase.error.code === 'CANCELLED') {
            return;
          }
          throttle.cancel();
          setState({ status: 'error', error: parsedBase.error });
          return;
        }
        throttle.push(100);

        beginPhase('parsing-overlay');
        const bufferOverlay = await toArrayBuffer(overlayFile);
        if (runId !== generationRef.current) {
          return;
        }

        const parsedOverlay = await client.parse(bufferOverlay, {
          filename: resolveFilename(overlayFile, filenameOverlay),
          format: formatOverlay,
          limits,
        });
        if (runId !== generationRef.current) {
          return;
        }
        if (!parsedOverlay.ok) {
          if (parsedOverlay.error.code === 'CANCELLED') {
            return;
          }
          throttle.cancel();
          setState({ status: 'error', error: parsedOverlay.error });
          return;
        }
        throttle.push(100);

        beginPhase('overlaying');
        const overlayOptions: OverlayWorkbooksOptions = {
          ...options,
          limits: limits ?? options.limits,
        };
        const overlaid = await client.overlay(
          parsedBase.value,
          parsedOverlay.value,
          overlayOptions,
        );
        if (runId !== generationRef.current) {
          return;
        }
        if (!overlaid.ok) {
          if (overlaid.error.code === 'CANCELLED') {
            return;
          }
          throttle.cancel();
          setState({ status: 'error', error: overlaid.error });
          return;
        }

        if (overlaid.value.kind === 'result') {
          throttle.push(100);
          setState({
            status: 'success',
            workbook: overlaid.value.value.workbook,
            summary: overlaid.value.value.summary,
            workbookBase: parsedBase.value,
            workbookOverlay: parsedOverlay.value,
          });
          return;
        }

        // fn-pairs → main-thread chunked compose (50–100%)
        beginPhase('composing');
        const pairsPayload = overlaid.value;
        const compose = options.schema.compose;
        if (compose.kind !== 'fn') {
          throttle.cancel();
          setState({
            status: 'error',
            error: {
              code: 'INVALID_SCHEMA',
              message: 'Expected fn compose after Worker returned pairs.',
            },
          });
          return;
        }

        const wrappedFn = createFnSlowWarning(
          compose.fn,
          pairsPayload.pairs.length,
          slowWarnFiredRef,
        );

        const composed = await runComposeChunked(
          pairsPayload.pairs,
          wrappedFn,
          pairsPayload.baseHeaders,
          pairsPayload.overlayHeaders,
          pairsPayload.sheetName,
          pairsPayload.baseFilename,
          pairsPayload.summary,
          {
            isCancelled: () =>
              cancelled || runId !== generationRef.current,
            onProgress: (processed, total) => {
              if (runId !== generationRef.current) {
                return;
              }
              const pct =
                total <= 0
                  ? 100
                  : 50 + Math.round((processed / total) * 50);
              throttle.push(pct);
            },
          },
        );

        if (runId !== generationRef.current || composed === null) {
          return;
        }

        throttle.push(100);
        setState({
          status: 'success',
          workbook: composed.workbook,
          summary: composed.summary,
          workbookBase: parsedBase.value,
          workbookOverlay: parsedOverlay.value,
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
                : 'Failed to read or overlay files.',
            details: { cause: String(cause) },
          },
        });
      }
    })();

    return () => {
      cancelled = true;
      generationRef.current += 1;
      throttle.cancel();
      unsubscribe();
      client.cancel();
    };
  }, [
    baseFile,
    overlayFile,
    options,
    filenameBase,
    filenameOverlay,
    formatBase,
    formatOverlay,
    limits,
    getClient,
    generationRef,
  ]);

  return state;
}
