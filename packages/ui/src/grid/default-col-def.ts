import type { ColDef } from 'ag-grid-community';

/** Shared defaultColDef for ExcelViewer / ExcelDiffViewer. User deep-merges on top. */
export const LIBRARY_DEFAULT_COL_DEF: ColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  floatingFilter: false,
  minWidth: 100,
};

/**
 * Split panes keep sortable off by default so left/right rows stay aligned.
 * Consumers can enable sorting via agGridProps.defaultColDef (accepting desync).
 */
export const SPLIT_DEFAULT_COL_DEF: ColDef = {
  ...LIBRARY_DEFAULT_COL_DEF,
  sortable: false,
};
