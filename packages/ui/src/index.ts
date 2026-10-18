export { ExcelViewer } from './excel-viewer.js';
export { ExcelDiffViewer } from './excel-diff-viewer.js';
export { ExcelSplitViewer } from './excel-split-viewer.js';
export { ExcelOverlayViewer } from './excel-overlay-viewer.js';
export { WorkbookSummary } from './summary/WorkbookSummary.js';
export { DiffSummary } from './summary/DiffSummary.js';
export { OverlaySummary } from './summary/OverlaySummary.js';
export { diffToCSV } from './csv/diff-to-csv.js';
export { downloadBlob } from './csv/download-blob.js';
export { downloadCsv } from './csv/download-csv.js';

export type {
  AgGridPropsPassthrough,
  ClassNameSlot,
  CommonProps,
  ExcelDiffViewerProps,
  ExcelOverlayViewerProps,
  ExcelSplitViewerProps,
  ExcelViewerProps,
  ExportMode,
  Theme,
} from './types.js';

export type {
  CommonSummaryProps,
  DiffSummaryProps,
  OverlaySummaryProps,
  SummaryClassNames,
  SummaryRenderers,
  WorkbookSummaryProps,
} from './summary/types.js';

// Data types sharing component names (WorkbookSummary, DiffSummary,
// OverlaySummary) are imported from `@mojro/excel-diff-core` — the value
// exports above are the presentational components.
export type {
  DiffError,
  DiffErrorCode,
  DiffResult,
  DiffSchema,
  Limits,
  OverlaySchema,
  OverlayWorkbooksOptions,
  Workbook,
} from '@mojro/excel-diff-core';

export type {
  DiffState,
  FileState,
  OverlayState,
} from '@mojro/excel-diff-react';
