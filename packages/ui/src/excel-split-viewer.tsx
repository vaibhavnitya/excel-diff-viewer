import { useExcelDiff } from '@mojro/excel-diff-react';
import { useEffect } from 'react';
import { EmptyView } from './components/empty-view.js';
import { ErrorView } from './components/error-view.js';
import { LoadingView } from './components/loading-view.js';
import { Toolbar } from './components/toolbar.js';
import { diffToCSV } from './csv/diff-to-csv.js';
import { downloadCsv } from './csv/download-csv.js';
import { SplitGrids } from './grid/split-grids.js';
import { slotClass } from './grid/class-slots.js';
import { useOnError } from './hooks/use-on-error.js';
import type { ExcelSplitViewerProps } from './types.js';
import { mergeRootStyle } from './utils/root-style.js';

export function ExcelSplitViewer({
  fileA,
  fileB,
  schema,
  labelA = 'File A',
  labelB = 'File B',
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
  theme,
  height,
  agGridProps,
}: ExcelSplitViewerProps) {
  const state = useExcelDiff(fileA, fileB, schema, { limits });
  useOnError(state.status === 'error' ? state.error : undefined, onError);

  useEffect(() => {
    if (state.status === 'success') {
      onDiffComplete?.(state.diff);
    }
  }, [state, onDiffComplete]);

  const idle =
    fileA === null || fileB === null || schema === null || state.status === 'idle';

  return (
    <div
      className={slotClass('root', classNames)}
      style={mergeRootStyle(theme, height, style)}
      data-edv-component="split"
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
            enableCSVExport={enableCSVExport}
            onExportCSV={() => {
              downloadCsv(exportFilename, diffToCSV(state.diff, schema));
            }}
          />
          {state.diff.rows.length === 0 ? (
            renderEmpty?.() ?? <EmptyView message="No rows to display." />
          ) : (
            <SplitGrids
              rows={state.diff.rows}
              headers={state.diff.headers}
              schema={schema}
              labelA={labelA}
              labelB={labelB}
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
