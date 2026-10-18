import type { OverlayMeta, OverlayResult, OverlaySummary, Row, Workbook } from '../types.js';

export function buildDerivedOverlayWorkbook(
  headers: readonly string[],
  rows: readonly Row[],
  sheetName: string,
  baseFilename: string | undefined,
  meta: OverlayMeta,
): Workbook {
  return {
    sheets: [
      {
        name: sheetName,
        headers,
        rows,
      },
    ],
    activeSheetIndex: 0,
    meta: {
      format: 'csv',
      filename: baseFilename !== undefined ? `overlay-${baseFilename}` : 'overlay.csv',
      overlay: meta,
    },
  };
}

export function overlaySummaryFromMeta(meta: OverlayMeta): OverlaySummary {
  return {
    totalBase: meta.totalBase,
    totalOverlay: meta.totalOverlay,
    matched: meta.matched,
    unmatched: meta.unmatched,
    droppedByCompose: meta.droppedByCompose,
  };
}

export function finishOverlayResult(
  headers: readonly string[],
  rows: readonly Row[],
  sheetName: string,
  baseFilename: string | undefined,
  partialSummary: Omit<OverlaySummary, 'droppedByCompose'>,
  droppedByCompose: number,
): OverlayResult {
  const meta: OverlayMeta = {
    ...partialSummary,
    droppedByCompose,
    rowWarnings: [],
  };
  return {
    workbook: buildDerivedOverlayWorkbook(
      headers,
      rows,
      sheetName,
      baseFilename,
      meta,
    ),
    summary: overlaySummaryFromMeta(meta),
  };
}
