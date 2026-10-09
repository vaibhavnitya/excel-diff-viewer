import { themeQuartz, type ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useMemo } from 'react';
import type { Sheet } from '@your-scope/excel-diff-core';
import type { ClassNameSlot } from '../types.js';
import { formatCellValue } from '../utils/format-cell.js';
import { gridContainerStyle } from '../utils/grid-container-style.js';
import { ensureAgGridModules } from './register-ag-grid.js';
import { slotClass } from './class-slots.js';

ensureAgGridModules();

const gridTheme = themeQuartz;

export type SheetGridProps = {
  sheet: Sheet;
  classNames?: Partial<Record<ClassNameSlot, string>>;
  className?: string;
  height?: number | string;
};

type SheetRow = { __rowIndex: number } & Record<string, string | number>;

export function SheetGrid({
  sheet,
  classNames,
  className,
  height,
}: SheetGridProps) {
  const columnDefs = useMemo<ColDef<SheetRow>[]>(
    () =>
      sheet.headers.map((header) => ({
        field: header,
        headerName: header,
        flex: 1,
        minWidth: 100,
        sortable: true,
        resizable: true,
      })),
    [sheet.headers],
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

  return (
    <div
      className={className ?? slotClass('grid', classNames)}
      style={gridContainerStyle(height)}
      data-edv-grid="sheet"
    >
      <AgGridReact<SheetRow>
        theme={gridTheme}
        columnDefs={columnDefs}
        rowData={rowData}
        getRowId={(params) => String(params.data.__rowIndex)}
        defaultColDef={{ sortable: true, resizable: true }}
        animateRows={false}
        suppressCellFocus
        rowHeight={32}
        headerHeight={36}
      />
    </div>
  );
}
