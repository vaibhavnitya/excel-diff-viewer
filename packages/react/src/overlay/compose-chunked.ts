import {
  finishOverlayResult,
  type CellValue,
  type ComposeFn,
  type MatchedPair,
  type NamedRow,
  type OverlayResult,
  type OverlaySummary,
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

function collectColumnUnion(
  baseHeaders: readonly string[],
  namedRows: readonly (NamedRow | null)[],
): string[] {
  const headers: string[] = [...baseHeaders];
  const seen = new Set<string>(baseHeaders);
  for (const named of namedRows) {
    if (named === null) continue;
    for (const key of Object.keys(named)) {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }
  }
  return headers;
}

function namedToDense(named: NamedRow, headers: readonly string[]): Row {
  const out: CellValue[] = new Array(headers.length);
  for (let i = 0; i < headers.length; i += 1) {
    const key = headers[i]!;
    out[i] = Object.prototype.hasOwnProperty.call(named, key)
      ? (named[key] ?? null)
      : null;
  }
  return out;
}

/**
 * Run `ComposeFn` over matched pairs on the main thread in rAF-sized chunks.
 *
 * NamedRow views are materialized per chunk (not up front) and released when
 * the chunk finishes. Cancellation is checked between chunks only.
 *
 * Two-pass: (1) collect column union + drop count while calling `fn`;
 * (2) emit dense rows.
 */
export async function runComposeChunked(
  pairs: readonly MatchedPair[],
  fn: ComposeFn,
  baseHeaders: readonly string[],
  overlayHeaders: readonly string[],
  sheetName: string,
  baseFilename: string | undefined,
  partialSummary: Omit<OverlaySummary, 'droppedByCompose'>,
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

  // Pass 2: dense emission from collected named rows
  const headers = collectColumnUnion(baseHeaders, namedResults);
  const rows: Row[] = [];
  for (const named of namedResults) {
    if (named === null) continue;
    rows.push(namedToDense(named, headers));
  }

  if (total === 0) {
    control.onProgress(0, 0);
  }

  return finishOverlayResult(
    headers,
    rows,
    sheetName,
    baseFilename,
    partialSummary,
    droppedByCompose,
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
