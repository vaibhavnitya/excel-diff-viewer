import {
  themeQuartz,
  type CellClassParams,
  type ColDef,
  type ICellRendererParams,
} from 'ag-grid-community';
import { AgGridReact, type AgGridReactProps } from 'ag-grid-react';
import { useMemo } from 'react';
import type {
  CellValue,
  DiffRow,
  DiffSchema,
  DiffStatus,
} from '@mojro/excel-diff-core';
import {
  agFilterForColumnType,
  detectColumnType,
} from '../detect-column-type.js';
import { mergeGridProps } from '../merge-grid-props.js';
import type { AgGridPropsPassthrough, ClassNameSlot } from '../types.js';
import { formatCellValue } from '../utils/format-cell.js';
import { gridContainerStyle } from '../utils/grid-container-style.js';
import { cx } from '../utils/cx.js';
import { LIBRARY_DEFAULT_COL_DEF } from './default-col-def.js';
import { ensureAgGridModules } from './register-ag-grid.js';
import { slotClass } from './class-slots.js';

ensureAgGridModules();

const gridTheme = themeQuartz;

export type DiffGridRow = {
  __key: string;
  __status: DiffStatus;
  __changedFields: ReadonlySet<string>;
  __oldValues: Readonly<Record<string, string>>;
  [field: string]:
    | string
    | DiffStatus
    | ReadonlySet<string>
    | Readonly<Record<string, string>>;
};

export type DiffGridProps = {
  rows: readonly DiffRow[];
  headers: readonly string[];
  schema: DiffSchema;
  classNames?: Partial<Record<ClassNameSlot, string>>;
  className?: string;
  height?: number | string;
  themeRowHeight?: number;
  themeHeaderHeight?: number;
  agGridProps?: AgGridPropsPassthrough;
};

function cellValueForDiffRow(
  row: DiffRow,
  columnIndex: number,
): CellValue | undefined {
  const fromB = row.rowB?.[columnIndex];
  const fromA = row.rowA?.[columnIndex];
  if (row.status === 'removed') {
    return fromA;
  }
  return fromB !== undefined ? fromB : fromA;
}

function collectDiffColumnValues(
  rows: readonly DiffRow[],
  columnIndex: number,
): CellValue[] {
  const values: CellValue[] = [];
  for (const row of rows) {
    const value = cellValueForDiffRow(row, columnIndex);
    if (value !== null && value !== undefined) {
      values.push(value);
    }
    if (values.length >= 100) {
      break;
    }
  }
  return values;
}

function toDiffGridRows(
  rows: readonly DiffRow[],
  headers: readonly string[],
): DiffGridRow[] {
  return rows.map((row) => {
    const changedFields = new Set(row.changes.map((c) => c.field));
    const oldValues: Record<string, string> = {};
    for (const change of row.changes) {
      oldValues[change.field] = formatCellValue(change.before);
    }
    const record: DiffGridRow = {
      __key: row.key,
      __status: row.status,
      __changedFields: changedFields,
      __oldValues: oldValues,
      status: row.status,
    };
    for (let i = 0; i < headers.length; i += 1) {
      const header = headers[i];
      if (header === undefined) {
        continue;
      }
      record[header] = formatCellValue(cellValueForDiffRow(row, i));
    }
    return record;
  });
}

function ModifiedCellRenderer(params: ICellRendererParams<DiffGridRow>) {
  const field = params.colDef?.field;
  const value = params.value == null ? '' : String(params.value);
  const oldValue =
    field !== undefined ? params.data?.__oldValues[field] : undefined;
  return (
    <span
      title={
        oldValue !== undefined && oldValue !== value ? `Was: ${oldValue}` : undefined
      }
    >
      {value}
    </span>
  );
}

export function DiffGrid({
  rows,
  headers,
  schema,
  classNames,
  className,
  height,
  themeRowHeight,
  themeHeaderHeight,
  agGridProps,
}: DiffGridProps) {
  const keySet = useMemo(() => new Set(schema.keyFields), [schema.keyFields]);

  const columnDefs = useMemo<ColDef<DiffGridRow>[]>(() => {
    const statusCol: ColDef<DiffGridRow> = {
      field: 'status',
      headerName: 'Status',
      width: 110,
      pinned: 'left',
      filter: 'agTextColumnFilter',
    };

    const dataCols = headers.map((header, columnIndex): ColDef<DiffGridRow> => {
      const isKey = keySet.has(header);
      const type = detectColumnType(collectDiffColumnValues(rows, columnIndex));
      return {
        field: header,
        headerName: header,
        flex: 1,
        minWidth: 100,
        filter: agFilterForColumnType(type),
        cellRenderer: ModifiedCellRenderer,
        cellClassRules: {
          [slotClass('keyColumn', classNames)]: () => isKey,
          [slotClass('modifiedCell', classNames)]: (
            params: CellClassParams<DiffGridRow>,
          ) =>
            params.data?.__status === 'modified' &&
            params.data.__changedFields.has(header),
          [slotClass('addedCell', classNames)]: (
            params: CellClassParams<DiffGridRow>,
          ) => params.data?.__status === 'added' && !isKey,
          [slotClass('removedCell', classNames)]: (
            params: CellClassParams<DiffGridRow>,
          ) => params.data?.__status === 'removed' && !isKey,
          'edv-removed-key': (params: CellClassParams<DiffGridRow>) =>
            params.data?.__status === 'removed' && isKey,
        },
      };
    });

    return [statusCol, ...dataCols];
  }, [headers, keySet, classNames, rows]);

  const rowData = useMemo(() => toDiffGridRows(rows, headers), [rows, headers]);

  const getRowClass = useMemo(
    () => (params: { data?: DiffGridRow }) => {
      const status = params.data?.__status;
      if (status === 'added') {
        return slotClass('addedRow', classNames);
      }
      if (status === 'removed') {
        return slotClass('removedRow', classNames);
      }
      if (status === 'modified') {
        return slotClass('modifiedRow', classNames);
      }
      return undefined;
    },
    [classNames],
  );

  const gridProps = useMemo(() => {
    const userClassName =
      typeof agGridProps?.className === 'string' ? agGridProps.className : undefined;
    const { className: _userClassName, ...userRest } =
      (agGridProps as Partial<AgGridReactProps<DiffGridRow>> | undefined) ?? {};
    void _userClassName;

    return mergeGridProps<DiffGridRow>(
      {
        theme: gridTheme,
        defaultColDef: LIBRARY_DEFAULT_COL_DEF,
        animateRows: false,
        suppressCellFocus: true,
        rowHeight: themeRowHeight ?? 32,
        headerHeight: themeHeaderHeight ?? 36,
        className: cx('edv-ag-grid', userClassName),
      },
      {
        columnDefs,
        rowData,
        getRowId: (params) => params.data.__key,
        getRowClass,
      },
      userRest,
    );
  }, [
    agGridProps,
    columnDefs,
    getRowClass,
    rowData,
    themeHeaderHeight,
    themeRowHeight,
  ]);

  return (
    <div
      className={className ?? slotClass('grid', classNames)}
      style={gridContainerStyle(height)}
      data-edv-grid="diff"
    >
      <AgGridReact<DiffGridRow> {...gridProps} />
    </div>
  );
}
