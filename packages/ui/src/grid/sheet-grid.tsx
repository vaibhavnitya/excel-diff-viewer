import { themeQuartz, type ColDef } from 'ag-grid-community';
import { AgGridReact, type AgGridReactProps } from 'ag-grid-react';
import { useMemo } from 'react';
import type { Sheet } from '@mojro/excel-diff-core';
import {
  agFilterForColumnType,
  collectColumnValues,
  detectColumnType,
} from '../detect-column-type.js';
import { mergeGridProps } from '../merge-grid-props.js';
import type { AgGridPropsPassthrough, ClassNameSlot } from '../types.js';
import { formatCellValue } from '../utils/format-cell.js';
import { gridContainerStyle } from '../utils/grid-container-style.js';
import { LIBRARY_DEFAULT_COL_DEF } from './default-col-def.js';
import { ensureAgGridModules } from './register-ag-grid.js';
import { slotClass } from './class-slots.js';

ensureAgGridModules();

const gridTheme = themeQuartz;

export type SheetRow = { __rowIndex: number } & Record<string, string | number>;

export type SheetGridProps = {
  sheet: Sheet;
  classNames?: Partial<Record<ClassNameSlot, string>>;
  className?: string;
  height?: number | string;
  /** From `theme.spacing.rowHeight` — library default before user agGridProps. */
  themeRowHeight?: number;
  /** From `theme.spacing.headerHeight` — library default before user agGridProps. */
  themeHeaderHeight?: number;
  agGridProps?: AgGridPropsPassthrough;
};

export function SheetGrid({
  sheet,
  classNames,
  className,
  height,
  themeRowHeight,
  themeHeaderHeight,
  agGridProps,
}: SheetGridProps) {
  const columnDefs = useMemo<ColDef<SheetRow>[]>(
    () =>
      sheet.headers.map((header, columnIndex) => {
        const type = detectColumnType(
          collectColumnValues(sheet.rows, columnIndex),
        );
        return {
          field: header,
          headerName: header,
          flex: 1,
          minWidth: 100,
          filter: agFilterForColumnType(type),
        };
      }),
    [sheet.headers, sheet.rows],
  );

  const rowData = useMemo<SheetRow[]>(
    () =>
      sheet.rows.map((row, index) => {
        const record: SheetRow = { __rowIndex: index };
        for (let i = 0; i < sheet.headers.length; i += 1) {
          const header = sheet.headers[i];
          if (header !== undefined) {
            record[header] = formatCellValue(row[i]);
          }
        }
        return record;
      }),
    [sheet.headers, sheet.rows],
  );

  const gridProps = useMemo(
    () =>
      mergeGridProps<SheetRow>(
        {
          theme: gridTheme,
          columnDefs,
          defaultColDef: LIBRARY_DEFAULT_COL_DEF,
          animateRows: false,
          suppressCellFocus: true,
          rowHeight: themeRowHeight ?? 32,
          headerHeight: themeHeaderHeight ?? 36,
        },
        {
          rowData,
          getRowId: (params) => String(params.data.__rowIndex),
        },
        agGridProps as Partial<AgGridReactProps<SheetRow>>,
      ),
    [agGridProps, columnDefs, rowData, themeHeaderHeight, themeRowHeight],
  );

  return (
    <div
      className={className ?? slotClass('grid', classNames)}
      style={gridContainerStyle(height)}
      data-edv-grid="sheet"
    >
      <AgGridReact<SheetRow> {...gridProps} />
    </div>
  );
}
