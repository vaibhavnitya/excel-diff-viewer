import { useExcelOverlay } from '@mojro/excel-diff-react';
import { useMemo } from 'react';
import { EmptyView } from './components/empty-view.js';
import { ErrorView } from './components/error-view.js';
import { LoadingView } from './components/loading-view.js';
import { Toolbar } from './components/toolbar.js';
import { downloadCsv } from './csv/download-csv.js';
import { workbookToCsv } from './csv/workbook-to-csv.js';
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
  exportFilename = 'overlay.csv',
}: ExcelOverlayViewerProps) {
  const state = useExcelOverlay(baseFile, overlayFile, options, { limits });

  useOnError(state.status === 'error' ? state.error : undefined, onError);

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

      {state.status === 'success' && sheet !== null ? (
        <>
          <Toolbar
            className={slotClass('toolbar', classNames)}
            enableCSVExport={enableCSVExport}
            onExportCSV={() => {
              downloadCsv(exportFilename, workbookToCsv(state.workbook));
            }}
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
