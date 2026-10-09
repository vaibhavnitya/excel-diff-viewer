import {
  themeQuartz,
  type BodyScrollEvent,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useCallback, useMemo, useRef } from 'react';
import type { DiffRow, DiffSchema } from '@mojro/excel-diff-core';
import type { ClassNameSlot } from '../types.js';
import { formatCellValue } from '../utils/format-cell.js';
import { gridContainerStyle } from '../utils/grid-container-style.js';
import { ensureAgGridModules } from './register-ag-grid.js';
import { slotClass } from './class-slots.js';

ensureAgGridModules();

const gridTheme = themeQuartz;

const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 36;

type SplitRow = {
  __key: string;
  __ghost: boolean;
  [field: string]: string | boolean;
};

export type SplitGridsProps = {
  rows: readonly DiffRow[];
  headers: readonly string[];
  schema: DiffSchema;
  labelA: string;
  labelB: string;
  classNames?: Partial<Record<ClassNameSlot, string>>;
  height?: number | string;
};

function buildSideRows(
  rows: readonly DiffRow[],
  headers: readonly string[],
  side: 'a' | 'b',
): SplitRow[] {
  return rows.map((row) => {
    const source = side === 'a' ? row.rowA : row.rowB;
    const ghost = source === undefined;
    const record: SplitRow = {
      __key: row.key,
      __ghost: ghost,
    };
    for (let i = 0; i < headers.length; i += 1) {
      const header = headers[i];
      if (header !== undefined) {
        record[header] = ghost ? '' : formatCellValue(source?.[i]);
      }
    }
    return record;
  });
}

export function SplitGrids({
  rows,
  headers,
  schema,
  labelA,
  labelB,
  classNames,
  height,
}: SplitGridsProps) {
  const apiA = useRef<GridApi<SplitRow> | null>(null);
  const apiB = useRef<GridApi<SplitRow> | null>(null);
  const syncing = useRef(false);

  const columnDefs = useMemo<ColDef<SplitRow>[]>(
    () =>
      headers.map((header) => ({
        field: header,
        headerName: header,
        flex: 1,
        minWidth: 100,
        cellClass: schema.keyFields.includes(header)
          ? slotClass('keyColumn', classNames)
          : undefined,
      })),
    [headers, schema.keyFields, classNames],
  );

  const rowDataA = useMemo(() => buildSideRows(rows, headers, 'a'), [rows, headers]);
  const rowDataB = useMemo(() => buildSideRows(rows, headers, 'b'), [rows, headers]);

  const syncFrom = useCallback((source: 'a' | 'b', top: number) => {
    if (syncing.current) {
      return;
    }
    syncing.current = true;
    const target = source === 'a' ? apiB.current : apiA.current;
    if (target !== null) {
      const index = Math.max(0, Math.floor(top / ROW_HEIGHT));
      target.ensureIndexVisible(index, 'top');
    }
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  }, []);

  const onBodyScrollA = useCallback(
    (event: BodyScrollEvent) => {
      if (event.direction === 'vertical') {
        syncFrom('a', event.top);
      }
    },
    [syncFrom],
  );

  const onBodyScrollB = useCallback(
    (event: BodyScrollEvent) => {
      if (event.direction === 'vertical') {
        syncFrom('b', event.top);
      }
    },
    [syncFrom],
  );

  const onReadyA = useCallback((event: GridReadyEvent<SplitRow>) => {
    apiA.current = event.api;
  }, []);
  const onReadyB = useCallback((event: GridReadyEvent<SplitRow>) => {
    apiB.current = event.api;
  }, []);

  const gridClass = slotClass('grid', classNames);

  const paneGridStyle = { height: '100%' as const, minHeight: 0, flex: 1 };

  return (
    <div className="edv-split" style={gridContainerStyle(height)} data-edv-grid="split">
      <div className="edv-split__pane" data-edv-split-side="a">
        <div className="edv-split__label">{labelA}</div>
        <div className={gridClass} style={paneGridStyle} data-edv-grid="split-a">
          <AgGridReact<SplitRow>
            theme={gridTheme}
            columnDefs={columnDefs}
            rowData={rowDataA}
            getRowId={(params) => params.data.__key}
            getRowClass={(params) =>
              params.data?.__ghost === true ? 'edv-ghost-row' : undefined
            }
            onGridReady={onReadyA}
            onBodyScroll={onBodyScrollA}
            defaultColDef={{ sortable: false, resizable: true }}
            animateRows={false}
            suppressCellFocus
            rowHeight={ROW_HEIGHT}
            headerHeight={HEADER_HEIGHT}
          />
        </div>
      </div>
      <div className="edv-split__pane" data-edv-split-side="b">
        <div className="edv-split__label">{labelB}</div>
        <div className={gridClass} style={paneGridStyle} data-edv-grid="split-b">
          <AgGridReact<SplitRow>
            theme={gridTheme}
            columnDefs={columnDefs}
            rowData={rowDataB}
            getRowId={(params) => params.data.__key}
            getRowClass={(params) =>
              params.data?.__ghost === true ? 'edv-ghost-row' : undefined
            }
            onGridReady={onReadyB}
            onBodyScroll={onBodyScrollB}
            defaultColDef={{ sortable: false, resizable: true }}
            animateRows={false}
            suppressCellFocus
            rowHeight={ROW_HEIGHT}
            headerHeight={HEADER_HEIGHT}
          />
        </div>
      </div>
    </div>
  );
}
