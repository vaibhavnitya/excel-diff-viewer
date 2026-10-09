// Public API. Hooks + types only — engine functions stay in core.
// PRINCIPLES.md §10: smallest possible surface.

export { useExcelFile } from './use-excel-file.js';
export { useExcelDiff } from './use-excel-diff.js';

export type {
  DiffPhase,
  DiffState,
  FileState,
  UseExcelDiffOptions,
  UseExcelFileOptions,
} from './types.js';

export type {
  DiffError,
  DiffResult,
  DiffSchema,
  ParseFileOptions,
  Result,
  Workbook,
} from '@mojro/excel-diff-core';
