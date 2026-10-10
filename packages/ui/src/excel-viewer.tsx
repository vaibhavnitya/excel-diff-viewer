import { useExcelFile } from '@mojro/excel-diff-react';
import { useEffect, useMemo, useState } from 'react';
import { EmptyView } from './components/empty-view.js';
import { ErrorView } from './components/error-view.js';
import { LoadingView } from './components/loading-view.js';
import { SheetTabs } from './components/sheet-tabs.js';
import { SheetGrid } from './grid/sheet-grid.js';
import { slotClass } from './grid/class-slots.js';
import { useOnError } from './hooks/use-on-error.js';
import type { ExcelViewerProps } from './types.js';
import { cx } from './utils/cx.js';

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
  height,
  agGridProps,
}: ExcelViewerProps) {
  const state = useExcelFile(file, {
    filename: options?.filename,
    format: options?.format,
    limits: limits ?? options?.limits,
  });

  useOnError(state.status === 'error' ? state.error : undefined, onError);

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

  return (
    <div
      className={slotClass('root', classNames)}
      style={{
        ...(height !== undefined ? { height } : undefined),
        ...style,
      }}
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
            className={cx(
              // ErrorView already applies edv-error; slot override only
              classNames?.error,
            )}
          />
        )
      ) : null}

      {state.status === 'success' && sheet !== null && activeSheet !== null ? (
        <>
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
            agGridProps={agGridProps}
          />
        </>
      ) : null}

      {state.status === 'success' && sheet === null ? (
        renderEmpty?.() ?? <EmptyView message="Sheet not found." />
      ) : null}
    </div>
  );
}
