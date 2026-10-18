import { useExcelFile } from '@mojro/excel-diff-react';
import type { DiffError } from '@mojro/excel-diff-core';
import { useEffect, useMemo, useState } from 'react';
import { EmptyView } from './components/empty-view.js';
import { ErrorView } from './components/error-view.js';
import { LoadingView } from './components/loading-view.js';
import { SheetTabs } from './components/sheet-tabs.js';
import { Toolbar } from './components/toolbar.js';
import { downloadCsv } from './csv/download-csv.js';
import { workbookToCsv, sheetToCsv } from './csv/workbook-to-csv.js';
import { viewerExportFilename } from './export/filenames.js';
import { runXlsxExport } from './export/run-xlsx-export.js';
import { workbookFromSheet } from './export/sheet-workbook.js';
import { SheetGrid } from './grid/sheet-grid.js';
import { slotClass } from './grid/class-slots.js';
import { useOnError } from './hooks/use-on-error.js';
import type { ExcelViewerProps } from './types.js';
import { cx } from './utils/cx.js';
import { mergeRootStyle } from './utils/root-style.js';

export function ExcelViewer({
  file,
  defaultSheet,
  onSheetChange,
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
  exportFilename = 'export.csv',
  exportMode = 'current-view',
}: ExcelViewerProps) {
  const state = useExcelFile(file, {
    filename: options?.filename,
    format: options?.format,
    limits: limits ?? options?.limits,
  });

  const [exportError, setExportError] = useState<DiffError | undefined>();
  const [exporting, setExporting] = useState(false);

  useOnError(state.status === 'error' ? state.error : exportError, onError);

  const sheetNames = useMemo(() => {
    if (state.status !== 'success') {
      return [] as string[];
    }
    return state.workbook.sheets.map((sheet) => sheet.name);
  }, [state]);

  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  useEffect(() => {
    if (sheetNames.length === 0) {
      setActiveSheet(null);
      return;
    }
    setActiveSheet((current) => {
      if (defaultSheet !== undefined && sheetNames.includes(defaultSheet)) {
        return defaultSheet;
      }
      if (current !== null && sheetNames.includes(current)) {
        return current;
      }
      return sheetNames[0] ?? null;
    });
  }, [sheetNames, defaultSheet]);

  useEffect(() => {
    if (state.status === 'success') {
      setExportError(undefined);
    }
  }, [state]);

  const sheet = useMemo(() => {
    if (state.status !== 'success' || activeSheet === null) {
      return null;
    }
    return state.workbook.sheets.find((s) => s.name === activeSheet) ?? null;
  }, [state, activeSheet]);

  const handleSheetChange = (name: string): void => {
    setActiveSheet(name);
    onSheetChange?.(name);
  };

  const handleExportXlsx = async (): Promise<void> => {
    if (state.status !== 'success' || exporting) return;
    setExporting(true);
    setExportError(undefined);
    const filename = viewerExportFilename(state.workbook.meta.filename);
    const toWrite =
      exportMode === 'raw' || sheet === null
        ? state.workbook
        : workbookFromSheet(sheet, filename);
    const error = await runXlsxExport(toWrite, filename);
    if (error !== undefined) {
      setExportError(error);
    }
    setExporting(false);
  };

  return (
    <div
      className={slotClass('root', classNames)}
      style={mergeRootStyle(theme, height, style)}
      data-edv-component="viewer"
    >
      {state.status === 'idle' || file === null ? (
        renderEmpty?.() ?? <EmptyView message="No file loaded." />
      ) : null}

      {state.status === 'loading' ? (
        renderLoading?.(state.progress) ?? (
          <LoadingView
            progress={state.progress}
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

      {state.status === 'success' && sheet !== null && activeSheet !== null && exportError === undefined ? (
        <>
          <Toolbar
            className={slotClass('toolbar', classNames)}
            enableCSVExport={enableCSVExport}
            onExportCSV={() => {
              const csv =
                exportMode === 'raw'
                  ? workbookToCsv(state.workbook)
                  : sheetToCsv(sheet);
              downloadCsv(exportFilename, csv);
            }}
            enableXlsxExport={enableXlsxExport}
            onExportXlsx={() => {
              void handleExportXlsx();
            }}
            exporting={exporting}
          />
          <SheetTabs
            sheets={sheetNames}
            activeSheet={activeSheet}
            onSheetChange={handleSheetChange}
            className={slotClass('sheetTabs', classNames)}
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

      {state.status === 'success' && sheet === null && exportError === undefined ? (
        renderEmpty?.() ?? <EmptyView message="Sheet not found." />
      ) : null}
    </div>
  );
}
