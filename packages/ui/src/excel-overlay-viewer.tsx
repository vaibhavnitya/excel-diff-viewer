import { useExcelOverlay } from '@mojro/excel-diff-react';
import type { DiffError } from '@mojro/excel-diff-core';
import { useEffect, useMemo, useState } from 'react';
import { EmptyView } from './components/empty-view.js';
import { ErrorView } from './components/error-view.js';
import { LoadingView } from './components/loading-view.js';
import { Toolbar } from './components/toolbar.js';
import { downloadCsv } from './csv/download-csv.js';
import { workbookToCsv } from './csv/workbook-to-csv.js';
import { overlayExportFilename } from './export/filenames.js';
import { runXlsxExport } from './export/run-xlsx-export.js';
import { slotClass } from './grid/class-slots.js';
import { SheetGrid } from './grid/sheet-grid.js';
import { useOnError } from './hooks/use-on-error.js';
import type { ExcelOverlayViewerProps } from './types.js';
import { cx } from './utils/cx.js';
import { mergeRootStyle } from './utils/root-style.js';

export function ExcelOverlayViewer({
  baseFile,
  overlayFile,
  options,
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
  enableCSVExport = true,
  enableXlsxExport = true,
  exportFilename = 'overlay.csv',
  exportMode = 'current-view',
}: ExcelOverlayViewerProps) {
  // exportMode reserved for AG Grid filter reflection later; derived workbook
  // has no library-level row filter today — both modes export the derived sheet.
  void exportMode;

  const state = useExcelOverlay(baseFile, overlayFile, options, { limits });
  const [exportError, setExportError] = useState<DiffError | undefined>();
  const [exporting, setExporting] = useState(false);

  useOnError(state.status === 'error' ? state.error : exportError, onError);

  useEffect(() => {
    if (state.status === 'success') {
      setExportError(undefined);
    }
  }, [state]);

  const sheet = useMemo(() => {
    if (state.status !== 'success') {
      return null;
    }
    return (
      state.workbook.sheets[state.workbook.activeSheetIndex] ??
      state.workbook.sheets[0] ??
      null
    );
  }, [state]);

  const handleExportXlsx = async (): Promise<void> => {
    if (state.status !== 'success' || exporting) return;
    setExporting(true);
    setExportError(undefined);
    const filename = overlayExportFilename(state.workbookBase.meta.filename);
    const error = await runXlsxExport(state.workbook, filename);
    if (error !== undefined) {
      setExportError(error);
    }
    setExporting(false);
  };

  return (
    <div
      className={slotClass('root', classNames)}
      style={mergeRootStyle(theme, height, style)}
      data-edv-component="overlay"
    >
      {state.status === 'idle' ||
      baseFile === null ||
      overlayFile === null ||
      options === null ? (
        renderEmpty?.() ?? (
          <EmptyView message="Provide a base file, overlay file, and schema." />
        )
      ) : null}

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
          <ErrorView
            error={state.error}
            className={cx(classNames?.error)}
          />
        )
      ) : null}

      {exportError !== undefined && state.status === 'success' ? (
        renderError?.(exportError) ?? (
          <ErrorView error={exportError} className={cx(classNames?.error)} />
        )
      ) : null}

      {state.status === 'success' && sheet !== null && exportError === undefined ? (
        <>
          <Toolbar
            className={slotClass('toolbar', classNames)}
            enableCSVExport={enableCSVExport}
            onExportCSV={() => {
              downloadCsv(exportFilename, workbookToCsv(state.workbook));
            }}
            enableXlsxExport={enableXlsxExport}
            onExportXlsx={() => {
              void handleExportXlsx();
            }}
            exporting={exporting}
            extra={
              <span data-edv-overlay-stats>
                {state.summary.totalBase} rows • {state.summary.matched} matched
                • {state.summary.unmatched} unmatched
              </span>
            }
          />
          <SheetGrid
            sheet={sheet}
            classNames={classNames}
            height={height}
            themeRowHeight={theme?.spacing?.rowHeight}
            themeHeaderHeight={theme?.spacing?.headerHeight}
            agGridProps={agGridProps}
          />
        </>
      ) : null}
    </div>
  );
}
