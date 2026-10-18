import {
  finishOverlayResult,
  materializeFnOverlay,
  type CellValue,
  type ComposeFn,
  type MatchedPair,
  type NamedRow,
  type OverlayPartialSummary,
  type OverlayResult,
  type Row,
} from '@mojro/excel-diff-core';

export type ComposeChunkedControl = {
  readonly isCancelled: () => boolean;
  /** Called with pairs processed so far and total pairs. */
  readonly onProgress: (processed: number, total: number) => void;
  /** Pairs per animation frame. Default 1000. */
  readonly chunkSize?: number;
};

const DEFAULT_CHUNK = 1000;

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        resolve();
      });
      return;
    }
    queueMicrotask(() => {
      resolve();
    });
  });
}

function rowToNamed(row: Row, headers: readonly string[]): NamedRow {
  const out: Record<string, CellValue> = {};
  for (let i = 0; i < headers.length; i += 1) {
    out[headers[i]!] = row[i] ?? null;
  }
  return out;
}

/**
 * Run `ComposeFn` over matched pairs on the main thread in rAF-sized chunks.
 *
 * NamedRow views are materialized per chunk (not up front) and released when
 * the chunk finishes. Cancellation is checked between chunks only.
 *
 * Two-pass: (1) collect named results + drop count while calling `fn`;
 * (2) dense emission + derived-column summary via core `materializeFnOverlay`.
 */
export async function runComposeChunked(
  pairs: readonly MatchedPair[],
  fn: ComposeFn,
  baseHeaders: readonly string[],
  overlayHeaders: readonly string[],
  sheetName: string,
  baseFilename: string | undefined,
  partialSummary: OverlayPartialSummary,
  control: ComposeChunkedControl,
): Promise<OverlayResult | null> {
  const chunkSize = control.chunkSize ?? DEFAULT_CHUNK;
  const total = pairs.length;
  const namedResults: (NamedRow | null)[] = new Array(total);
  let droppedByCompose = 0;

  for (let i = 0; i < total; i += chunkSize) {
    if (control.isCancelled()) {
      return null;
    }

    const end = Math.min(i + chunkSize, total);
    for (let j = i; j < end; j += 1) {
      const pair = pairs[j]!;
      const baseNamed = rowToNamed(pair.baseRow, baseHeaders);
      const overlayNamed = pair.overlayRows.map((r) =>
        rowToNamed(r, overlayHeaders),
      );
      const result = fn(baseNamed, overlayNamed);
      namedResults[j] = result;
      if (result === null) {
        droppedByCompose += 1;
      }
    }

    control.onProgress(end, total);

    if (end < total) {
      await nextFrame();
    }
  }

  if (control.isCancelled()) {
    return null;
  }

  const materialized = materializeFnOverlay(namedResults, baseHeaders);

  if (total === 0) {
    control.onProgress(0, 0);
  }

  return finishOverlayResult(
    materialized.headers,
    materialized.rows,
    sheetName,
    baseFilename,
    partialSummary,
    droppedByCompose,
    materialized.targetColumns,
  );
}

/**
 * Dev-only: measure first `sampleSize` fn calls; warn once if avg > 1ms.
 * Zero cost in production (`NODE_ENV === 'production'`).
 */
export function createFnSlowWarning(
  fn: ComposeFn,
  totalPairs: number,
  firedRef: { current: boolean },
): ComposeFn {
  if (process.env.NODE_ENV === 'production' || firedRef.current) {
    return fn;
  }

  const sampleSize = Math.min(100, totalPairs);
  let samples = 0;
  let totalMs = 0;

  return (baseRow, overlayRows) => {
    if (firedRef.current || samples >= sampleSize) {
      return fn(baseRow, overlayRows);
    }
    const start =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const result = fn(baseRow, overlayRows);
    const end =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    totalMs += end - start;
    samples += 1;
    if (samples >= sampleSize && !firedRef.current) {
      const avg = totalMs / samples;
      if (avg > 1) {
        firedRef.current = true;
        const estimate = (avg * totalPairs) / 1000;
        console.warn(
          `[useExcelOverlay] ComposeFn averages ${avg.toFixed(2)}ms over ${samples} calls ` +
            `(${totalPairs} pairs total ≈ ${estimate.toFixed(1)}s). Profile the compose function.`,
        );
      }
    }
    return result;
  };
}
