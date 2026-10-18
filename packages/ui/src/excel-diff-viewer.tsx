import { useExcelDiff } from '@mojro/excel-diff-react';
import type { DiffError } from '@mojro/excel-diff-core';
import { useEffect, useMemo, useState } from 'react';
import { EmptyView } from './components/empty-view.js';
import { ErrorView } from './components/error-view.js';
import { LoadingView } from './components/loading-view.js';
import { Toolbar } from './components/toolbar.js';
import { diffToCSV } from './csv/diff-to-csv.js';
import { downloadCsv } from './csv/download-csv.js';
import { diffRowsToWorkbook } from './export/diff-to-workbook.js';
import { diffExportFilename } from './export/filenames.js';
import { runXlsxExport } from './export/run-xlsx-export.js';
import { DiffGrid } from './grid/diff-grid.js';
import { slotClass } from './grid/class-slots.js';
import { useOnError } from './hooks/use-on-error.js';
import type { ExcelDiffViewerProps } from './types.js';
import { filterDiffRows } from './utils/filter-diff-rows.js';
import { mergeRootStyle } from './utils/root-style.js';

export function ExcelDiffViewer({
  fileA,
  fileB,
  schema,
  showOnlyChanges: showOnlyChangesProp,
  onShowOnlyChangesChange,
  searchQuery: searchQueryProp,
  onSearchQueryChange,
  onDiffComplete,
  enableCSVExport = true,
  enableXlsxExport = true,
  exportFilename = 'diff.csv',
  exportMode = 'current-view',
  classNames,
  limits,
  onError,
  renderError,
  renderLoading,
  renderEmpty,
  style,
  theme,
  height,
  agGridProps,
}: ExcelDiffViewerProps) {
  const state = useExcelDiff(fileA, fileB, schema, { limits });
  const [exportError, setExportError] = useState<DiffError | undefined>();
  const [exporting, setExporting] = useState(false);

  useOnError(state.status === 'error' ? state.error : exportError, onError);

  const [internalShowOnly, setInternalShowOnly] = useState(false);
  const [internalSearch, setInternalSearch] = useState('');

  const showOnlyChanges = showOnlyChangesProp ?? internalShowOnly;
  const searchQuery = searchQueryProp ?? internalSearch;

  useEffect(() => {
    if (state.status === 'success') {
      onDiffComplete?.(state.diff);
      setExportError(undefined);
    }
  }, [state, onDiffComplete]);

  const visibleRows = useMemo(() => {
    if (state.status !== 'success' || schema === null) {
      return [];
    }
    return filterDiffRows(state.diff.rows, schema, state.diff.headers, {
      showOnlyChanges,
      searchQuery,
    });
  }, [state, schema, showOnlyChanges, searchQuery]);

  const idle =
    fileA === null || fileB === null || schema === null || state.status === 'idle';

  const handleExportXlsx = async (): Promise<void> => {
    if (state.status !== 'success' || exporting) return;
    setExporting(true);
    setExportError(undefined);
    const rows = exportMode === 'raw' ? state.diff.rows : visibleRows;
    const filename = diffExportFilename(
      state.workbookA.meta.filename,
      state.workbookB.meta.filename,
    );
    const workbook = diffRowsToWorkbook(state.diff, rows, filename);
    const error = await runXlsxExport(workbook, filename);
    if (error !== undefined) {
      setExportError(error);
    }
    setExporting(false);
  };

  return (
    <div
      className={slotClass('root', classNames)}
      style={mergeRootStyle(theme, height, style)}
      data-edv-component="diff"
    >
      {idle ? renderEmpty?.() ?? <EmptyView message="Provide two files and a schema." /> : null}

      {state.status === 'loading' ? (
        renderLoading?.(state.progress, state.phase) ?? (
          <LoadingView
            progress={state.progress}
            phase={state.phase}
            className={slotClass('loading', classNames)}
          />
        )
      ) : null}

      {state.status === 'error' ? (
        renderError?.(state.error) ?? (
          <ErrorView error={state.error} className={classNames?.error} />
        )
      ) : null}

      {exportError !== undefined && state.status === 'success' ? (
        renderError?.(exportError) ?? (
          <ErrorView error={exportError} className={classNames?.error} />
        )
      ) : null}

      {state.status === 'success' && schema !== null && exportError === undefined ? (
        <>
          <Toolbar
            className={slotClass('toolbar', classNames)}
            stats={state.diff.stats}
            showOnlyChanges={showOnlyChanges}
            onShowOnlyChangesChange={(value) => {
              if (onShowOnlyChangesChange !== undefined) {
                onShowOnlyChangesChange(value);
              } else {
                setInternalShowOnly(value);
              }
            }}
            searchQuery={searchQuery}
            onSearchQueryChange={(value) => {
              if (onSearchQueryChange !== undefined) {
                onSearchQueryChange(value);
              } else {
                setInternalSearch(value);
              }
            }}
            enableCSVExport={enableCSVExport}
            onExportCSV={() => {
              downloadCsv(exportFilename, diffToCSV(state.diff, schema));
            }}
            enableXlsxExport={enableXlsxExport}
            onExportXlsx={() => {
              void handleExportXlsx();
            }}
            exporting={exporting}
          />
          {visibleRows.length === 0 ? (
            renderEmpty?.() ?? <EmptyView message="No rows to display." />
          ) : (
            <DiffGrid
              rows={visibleRows}
              headers={state.diff.headers}
              schema={schema}
              classNames={classNames}
              height={height}
              themeRowHeight={theme?.spacing?.rowHeight}
              themeHeaderHeight={theme?.spacing?.headerHeight}
              agGridProps={agGridProps}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
