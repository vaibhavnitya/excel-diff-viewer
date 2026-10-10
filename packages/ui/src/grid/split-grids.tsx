import {
  themeQuartz,
  type BodyScrollEvent,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
} from 'ag-grid-community';
import { AgGridReact, type AgGridReactProps } from 'ag-grid-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CellValue, DiffRow, DiffSchema } from '@mojro/excel-diff-core';
import {
  agFilterForColumnType,
  detectColumnType,
} from '../detect-column-type.js';
import { mergeGridProps } from '../merge-grid-props.js';
import type { AgGridPropsPassthrough, ClassNameSlot } from '../types.js';
import { formatCellValue } from '../utils/format-cell.js';
import { gridContainerStyle } from '../utils/grid-container-style.js';
import { SPLIT_DEFAULT_COL_DEF } from './default-col-def.js';
import { ensureAgGridModules } from './register-ag-grid.js';
import { slotClass } from './class-slots.js';

ensureAgGridModules();

const gridTheme = themeQuartz;

const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 36;

export type SplitRow = {
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
  agGridProps?: AgGridPropsPassthrough;
};

function cellValueForSide(
  row: DiffRow,
  columnIndex: number,
  side: 'a' | 'b',
): CellValue | undefined {
  return side === 'a' ? row.rowA?.[columnIndex] : row.rowB?.[columnIndex];
}

function collectSplitColumnValues(
  rows: readonly DiffRow[],
  columnIndex: number,
): CellValue[] {
  const values: CellValue[] = [];
  for (const row of rows) {
    for (const side of ['a', 'b'] as const) {
      const value = cellValueForSide(row, columnIndex, side);
      if (value !== null && value !== undefined) {
        values.push(value);
      }
      if (values.length >= 100) {
        return values;
      }
    }
  }
  return values;
}

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

function stripSplitComposedKeys(
  user: Partial<AgGridReactProps<SplitRow>> | undefined,
): Partial<AgGridReactProps<SplitRow>> | undefined {
  if (user === undefined) {
    return undefined;
  }
  const {
    onGridReady: _onGridReady,
    onBodyScroll: _onBodyScroll,
    rowData: _rowData,
    ...rest
  } = user;
  return rest;
}

export function SplitGrids({
  rows,
  headers,
  schema,
  labelA,
  labelB,
  classNames,
  height,
  agGridProps,
}: SplitGridsProps) {
  const apiA = useRef<GridApi<SplitRow> | null>(null);
  const apiB = useRef<GridApi<SplitRow> | null>(null);
  const syncing = useRef(false);

  const columnDefs = useMemo<ColDef<SplitRow>[]>(
    () =>
      headers.map((header, columnIndex) => {
        const type = detectColumnType(
          collectSplitColumnValues(rows, columnIndex),
        );
        return {
          field: header,
          headerName: header,
          flex: 1,
          minWidth: 100,
          filter: agFilterForColumnType(type),
          cellClass: schema.keyFields.includes(header)
            ? slotClass('keyColumn', classNames)
            : undefined,
        };
      }),
    [headers, schema.keyFields, classNames, rows],
  );

  const rowDataA = useMemo(
    () => buildSideRows(rows, headers, 'a'),
    [rows, headers],
  );
  const rowDataB = useMemo(
    () => buildSideRows(rows, headers, 'b'),
    [rows, headers],
  );

  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' &&
      agGridProps !== undefined &&
      Object.prototype.hasOwnProperty.call(agGridProps, 'rowData') &&
      agGridProps.rowData !== undefined
    ) {
      console.warn(
        '[excel-diff-ui] agGridProps.rowData is locked by the library and will be ignored.',
      );
    }
  }, [agGridProps]);

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

  const getRowClass = useCallback(
    (params: { data?: SplitRow }) =>
      params.data?.__ghost === true ? 'edv-ghost-row' : undefined,
    [],
  );

  const typedUser = agGridProps as Partial<AgGridReactProps<SplitRow>> | undefined;
  const userOnGridReady = typedUser?.onGridReady;
  const userOnBodyScroll = typedUser?.onBodyScroll;
  const userRest = useMemo(
    () => stripSplitComposedKeys(typedUser),
    [typedUser],
  );

  const baseMerged = useMemo(
    () =>
      mergeGridProps<SplitRow>(
        {
          theme: gridTheme,
          defaultColDef: SPLIT_DEFAULT_COL_DEF,
          animateRows: false,
          suppressCellFocus: true,
          rowHeight: ROW_HEIGHT,
          headerHeight: HEADER_HEIGHT,
        },
        {
          columnDefs,
          getRowId: (params) => params.data.__key,
          getRowClass,
        },
        userRest,
      ),
    [columnDefs, getRowClass, userRest],
  );

  const onReadyA = useCallback(
    (event: GridReadyEvent<SplitRow>) => {
      apiA.current = event.api;
      userOnGridReady?.(event);
    },
    [userOnGridReady],
  );
  const onReadyB = useCallback(
    (event: GridReadyEvent<SplitRow>) => {
      apiB.current = event.api;
      userOnGridReady?.(event);
    },
    [userOnGridReady],
  );

  const onBodyScrollA = useCallback(
    (event: BodyScrollEvent) => {
      if (event.direction === 'vertical') {
        syncFrom('a', event.top);
      }
      userOnBodyScroll?.(event);
    },
    [syncFrom, userOnBodyScroll],
  );
  const onBodyScrollB = useCallback(
    (event: BodyScrollEvent) => {
      if (event.direction === 'vertical') {
        syncFrom('b', event.top);
      }
      userOnBodyScroll?.(event);
    },
    [syncFrom, userOnBodyScroll],
  );

  const propsA: AgGridReactProps<SplitRow> = {
    ...baseMerged,
    rowData: rowDataA,
    onGridReady: onReadyA,
    onBodyScroll: onBodyScrollA,
  };
  const propsB: AgGridReactProps<SplitRow> = {
    ...baseMerged,
    rowData: rowDataB,
    onGridReady: onReadyB,
    onBodyScroll: onBodyScrollB,
  };

  const gridClass = slotClass('grid', classNames);
  const paneGridStyle = { height: '100%' as const, minHeight: 0, flex: 1 };

  return (
    <div className="edv-split" style={gridContainerStyle(height)} data-edv-grid="split">
      <div className="edv-split__pane" data-edv-split-side="a">
        <div className="edv-split__label">{labelA}</div>
        <div className={gridClass} style={paneGridStyle} data-edv-grid="split-a">
          <AgGridReact<SplitRow> {...propsA} />
        </div>
      </div>
      <div className="edv-split__pane" data-edv-split-side="b">
        <div className="edv-split__label">{labelB}</div>
        <div className={gridClass} style={paneGridStyle} data-edv-grid="split-b">
          <AgGridReact<SplitRow> {...propsB} />
        </div>
      </div>
    </div>
  );
}
