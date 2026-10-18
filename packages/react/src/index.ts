// Public API. Hooks + types only — engine functions stay in core.
// PRINCIPLES.md §10: smallest possible surface.

export { useExcelFile } from './use-excel-file.js';
export { useExcelDiff } from './use-excel-diff.js';
export { useExcelOverlay } from './use-excel-overlay.js';
export { useWorkbookSummary } from './use-workbook-summary.js';

export type {
  DiffPhase,
  DiffState,
  FileState,
  OverlayPhase,
  OverlayState,
  SummaryProgress,
  UseExcelDiffOptions,
  UseExcelFileOptions,
  UseExcelOverlayOptions,
  UseWorkbookSummaryOptions,
  UseWorkbookSummaryState,
} from './types.js';

export type {
  DiffError,
  DiffResult,
  DiffSchema,
  OverlayResult,
  OverlaySchema,
  OverlaySummary,
  OverlayWorkbooksOptions,
  ParseFileOptions,
  Result,
  SummaryCache,
  SummaryConfig,
  Workbook,
  WorkbookSummary,
} from '@mojro/excel-diff-core';
