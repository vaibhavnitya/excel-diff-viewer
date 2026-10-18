import type {
  ColumnSummary,
  OverlayMeta,
  OverlayResult,
  OverlaySummary,
  Row,
  Workbook,
} from '../types.js';

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

export function overlaySummaryFromMeta(
  meta: OverlayMeta,
  targetColumns: readonly ColumnSummary[] = [],
): OverlaySummary {
  return {
    totalBase: meta.totalBase,
    totalOverlay: meta.totalOverlay,
    matched: meta.matched,
    unmatched: meta.unmatched,
    droppedByCompose: meta.droppedByCompose,
    targetColumns,
  };
}

export type OverlayPartialSummary = Omit<
  OverlaySummary,
  'droppedByCompose' | 'targetColumns'
>;

export function finishOverlayResult(
  headers: readonly string[],
  rows: readonly Row[],
  sheetName: string,
  baseFilename: string | undefined,
  partialSummary: OverlayPartialSummary,
  droppedByCompose: number,
  targetColumns: readonly ColumnSummary[] = [],
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
    summary: overlaySummaryFromMeta(meta, targetColumns),
  };
}
