import type { CSSProperties, ReactNode } from 'react';
import type { AgGridReactProps } from 'ag-grid-react';
import type {
  DiffError,
  DiffResult,
  DiffSchema,
  Limits,
  ParseFileOptions,
} from '@mojro/excel-diff-core';
import type { Theme } from './theme.js';

export type { Theme } from './theme.js';

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

/**
 * Passthrough to the underlying `<AgGridReact>` after library defaults and
 * locked props are applied. See `/docs/filtering-and-sorting`.
 *
 * Row type varies by viewer (`SheetRow` / `DiffGridRow` / `SplitRow`);
 * `any` keeps CommonProps shared across components.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared across heterogeneous grid row types
export type AgGridPropsPassthrough = Partial<AgGridReactProps<any>>;

export type CommonProps = {
  classNames?: Partial<Record<ClassNameSlot, string>>;
  limits?: Partial<Limits>;
  onError?: (error: DiffError) => void;
  renderError?: (error: DiffError) => ReactNode;
  renderLoading?: (progress: number, phase?: string) => ReactNode;
  renderEmpty?: () => ReactNode;
  style?: CSSProperties;
  /**
   * Design tokens mapped to `--edv-*` CSS variables on the component root.
   * Partial overrides only — omitted fields keep stylesheet / dark-mode values.
   * See {@link Theme} for precedence vs `classNames` and `style`.
   */
  theme?: Theme;
  /** Explicit grid height (e.g. 600, "80vh"). Defaults to filling the parent. */
  height?: number | string;
  /**
   * AG Grid props passed through to `<AgGridReact>` after library defaults
   * and locked settings (rowData, getRowId, diff column structure, etc.).
   */
  agGridProps?: AgGridPropsPassthrough;
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
