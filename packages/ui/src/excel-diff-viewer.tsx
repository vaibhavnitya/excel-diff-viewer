import { useExcelDiff } from '@mojro/excel-diff-react';
import { useEffect, useMemo, useState } from 'react';
import { EmptyView } from './components/empty-view.js';
import { ErrorView } from './components/error-view.js';
import { LoadingView } from './components/loading-view.js';
import { Toolbar } from './components/toolbar.js';
import { diffToCSV } from './csv/diff-to-csv.js';
import { downloadCsv } from './csv/download-csv.js';
import { DiffGrid } from './grid/diff-grid.js';
import { slotClass } from './grid/class-slots.js';
import { useOnError } from './hooks/use-on-error.js';
import type { ExcelDiffViewerProps } from './types.js';
import { filterDiffRows } from './utils/filter-diff-rows.js';

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
  exportFilename = 'diff.csv',
  classNames,
  limits,
  onError,
  renderError,
  renderLoading,
  renderEmpty,
  style,
  height,
}: ExcelDiffViewerProps) {
  const state = useExcelDiff(fileA, fileB, schema, { limits });
  useOnError(state.status === 'error' ? state.error : undefined, onError);

  const [internalShowOnly, setInternalShowOnly] = useState(false);
  const [internalSearch, setInternalSearch] = useState('');

  const showOnlyChanges = showOnlyChangesProp ?? internalShowOnly;
  const searchQuery = searchQueryProp ?? internalSearch;

  useEffect(() => {
    if (state.status === 'success') {
      onDiffComplete?.(state.diff);
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

  return (
    <div
      className={slotClass('root', classNames)}
      style={{
        ...(height !== undefined ? { height } : undefined),
        ...style,
      }}
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

      {state.status === 'success' && schema !== null ? (
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
            />
          )}
        </>
      ) : null}
    </div>
  );
}
