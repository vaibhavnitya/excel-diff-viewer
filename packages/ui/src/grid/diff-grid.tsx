import {
  themeQuartz,
  type CellClassParams,
  type ColDef,
  type ICellRendererParams,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useMemo } from 'react';
import type { DiffRow, DiffSchema, DiffStatus } from '@your-scope/excel-diff-core';
import type { ClassNameSlot } from '../types.js';
import { formatCellValue } from '../utils/format-cell.js';
import { gridContainerStyle } from '../utils/grid-container-style.js';
import { cx } from '../utils/cx.js';
import { ensureAgGridModules } from './register-ag-grid.js';
import { slotClass } from './class-slots.js';

ensureAgGridModules();

const gridTheme = themeQuartz;

export type DiffGridRow = {
  __key: string;
  __status: DiffStatus;
  __changedFields: ReadonlySet<string>;
  __oldValues: Readonly<Record<string, string>>;
  [field: string]: string | DiffStatus | ReadonlySet<string> | Readonly<Record<string, string>>;
};

export type DiffGridProps = {
  rows: readonly DiffRow[];
  headers: readonly string[];
  schema: DiffSchema;
  classNames?: Partial<Record<ClassNameSlot, string>>;
  className?: string;
  height?: number | string;
};

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
      const fromB = row.rowB?.[i];
      const fromA = row.rowA?.[i];
      const value =
        row.status === 'removed'
          ? fromA
          : fromB !== undefined
            ? fromB
            : fromA;
      record[header] = formatCellValue(value);
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
    <span title={oldValue !== undefined && oldValue !== value ? `Was: ${oldValue}` : undefined}>
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
}: DiffGridProps) {
  const keySet = useMemo(() => new Set(schema.keyFields), [schema.keyFields]);

  const columnDefs = useMemo<ColDef<DiffGridRow>[]>(() => {
    const statusCol: ColDef<DiffGridRow> = {
      field: 'status',
      headerName: 'Status',
      width: 110,
      pinned: 'left',
    };

    const dataCols = headers.map((header): ColDef<DiffGridRow> => {
      const isKey = keySet.has(header);
      return {
        field: header,
        headerName: header,
        flex: 1,
        minWidth: 100,
        cellRenderer: ModifiedCellRenderer,
        cellClassRules: {
          [slotClass('keyColumn', classNames)]: () => isKey,
          [slotClass('modifiedCell', classNames)]: (params: CellClassParams<DiffGridRow>) =>
            params.data?.__status === 'modified' &&
            params.data.__changedFields.has(header),
          [slotClass('addedCell', classNames)]: (params: CellClassParams<DiffGridRow>) =>
            params.data?.__status === 'added' && !isKey,
          [slotClass('removedCell', classNames)]: (params: CellClassParams<DiffGridRow>) =>
            params.data?.__status === 'removed' && !isKey,
          'edv-removed-key': (params: CellClassParams<DiffGridRow>) =>
            params.data?.__status === 'removed' && isKey,
        },
      };
    });

    return [statusCol, ...dataCols];
  }, [headers, keySet, classNames]);

  const rowData = useMemo(() => toDiffGridRows(rows, headers), [rows, headers]);

  return (
    <div
      className={className ?? slotClass('grid', classNames)}
      style={gridContainerStyle(height)}
      data-edv-grid="diff"
    >
      <AgGridReact<DiffGridRow>
        theme={gridTheme}
        columnDefs={columnDefs}
        rowData={rowData}
        getRowId={(params) => params.data.__key}
        getRowClass={(params) => {
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
        }}
        defaultColDef={{ sortable: true, resizable: true }}
        animateRows={false}
        suppressCellFocus
        rowHeight={32}
        headerHeight={36}
        className={cx('edv-ag-grid')}
      />
    </div>
  );
}
