import { vi } from 'vitest';

vi.mock('ag-grid-community', () => ({
  ModuleRegistry: { registerModules: vi.fn() },
  AllCommunityModule: {},
  themeQuartz: {},
}));

vi.mock('ag-grid-react', () => ({
  AgGridReact: (props: {
    rowData?: Array<Record<string, unknown>>;
    columnDefs?: Array<{ field?: string; headerName?: string }>;
    getRowClass?: (params: {
      data?: Record<string, unknown>;
    }) => string | undefined;
    getRowId?: (params: { data: Record<string, unknown> }) => string;
  }) => {
    const rows = props.rowData ?? [];
    const cols = props.columnDefs ?? [];
    return (
      <table data-testid="mock-grid">
        <thead>
          <tr>
            {cols.map((col) => (
              <th key={col.field ?? col.headerName}>{col.headerName ?? col.field}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const id = props.getRowId?.({ data: row }) ?? String(index);
            const rowClass = props.getRowClass?.({ data: row }) ?? '';
            return (
              <tr
                key={id}
                data-row-id={id}
                className={rowClass}
                data-testid={`row-${id}`}
              >
                {cols.map((col) => {
                  const field = col.field ?? '';
                  return (
                    <td key={field} data-field={field}>
                      {String(row[field] ?? '')}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  },
}));
