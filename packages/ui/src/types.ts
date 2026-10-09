import type { CSSProperties, ReactNode } from 'react';
import type {
  DiffError,
  DiffResult,
  DiffSchema,
  Limits,
  ParseFileOptions,
} from '@mojro/excel-diff-core';

export type ClassNameSlot =
  | 'root'
  | 'toolbar'
  | 'grid'
  | 'sheetTabs'
  | 'error'
  | 'loading'
  | 'addedCell'
  | 'removedCell'
  | 'modifiedCell'
  | 'addedRow'
  | 'removedRow'
  | 'modifiedRow'
  | 'keyColumn';

export type CommonProps = {
  classNames?: Partial<Record<ClassNameSlot, string>>;
  limits?: Partial<Limits>;
  onError?: (error: DiffError) => void;
  renderError?: (error: DiffError) => ReactNode;
  renderLoading?: (progress: number, phase?: string) => ReactNode;
  renderEmpty?: () => ReactNode;
  style?: CSSProperties;
  /** Explicit grid height (e.g. 600, "80vh"). Defaults to filling the parent. */
  height?: number | string;
};

export type ExcelViewerProps = CommonProps & {
  file: File | ArrayBuffer | null;
  defaultSheet?: string;
  onSheetChange?: (sheetName: string) => void;
  options?: ParseFileOptions;
};

export type ExcelDiffViewerProps = CommonProps & {
  fileA: File | ArrayBuffer | null;
  fileB: File | ArrayBuffer | null;
  schema: DiffSchema | null;
  showOnlyChanges?: boolean;
  onShowOnlyChangesChange?: (value: boolean) => void;
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  onDiffComplete?: (diff: DiffResult) => void;
  enableCSVExport?: boolean;
  exportFilename?: string;
};

export type ExcelSplitViewerProps = CommonProps & {
  fileA: File | ArrayBuffer | null;
  fileB: File | ArrayBuffer | null;
  schema: DiffSchema | null;
  labelA?: string;
  labelB?: string;
  onDiffComplete?: (diff: DiffResult) => void;
  enableCSVExport?: boolean;
  exportFilename?: string;
};
