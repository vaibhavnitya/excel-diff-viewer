import { useExcelDiff } from '@mojro/excel-diff-react';
import type { DiffError } from '@mojro/excel-diff-core';
import { useEffect, useState } from 'react';
import { EmptyView } from './components/empty-view.js';
import { ErrorView } from './components/error-view.js';
import { LoadingView } from './components/loading-view.js';
import { Toolbar } from './components/toolbar.js';
import { diffToCSV } from './csv/diff-to-csv.js';
import { downloadCsv } from './csv/download-csv.js';
import { splitExportFilename } from './export/filenames.js';
import { runXlsxExport } from './export/run-xlsx-export.js';
import { splitDiffToWorkbook } from './export/split-to-workbook.js';
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
}: ExcelSplitViewerProps) {
  // Split has no library-level showOnlyChanges/search today; both modes export
  // all non-ghost rows. exportMode kept for API parity with other viewers.
  void exportMode;

  const state = useExcelDiff(fileA, fileB, schema, { limits });
  const [exportError, setExportError] = useState<DiffError | undefined>();
  const [exporting, setExporting] = useState(false);

  useOnError(state.status === 'error' ? state.error : exportError, onError);

  useEffect(() => {
    if (state.status === 'success') {
      onDiffComplete?.(state.diff);
      setExportError(undefined);
    }
  }, [state, onDiffComplete]);

  const idle =
    fileA === null || fileB === null || schema === null || state.status === 'idle';

  const handleExportXlsx = async (): Promise<void> => {
    if (state.status !== 'success' || exporting) return;
    setExporting(true);
    setExportError(undefined);
    const filename = splitExportFilename(
      state.workbookA.meta.filename,
      state.workbookB.meta.filename,
    );
    const baseSheetName =
      state.workbookA.sheets[state.workbookA.activeSheetIndex]?.name ?? 'Base';
    const overlaySheetName =
      state.workbookB.sheets[state.workbookB.activeSheetIndex]?.name ?? 'Overlay';
    const workbook = splitDiffToWorkbook(state.diff, state.diff.rows, {
      baseSheetName,
      overlaySheetName,
      filename,
    });
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
