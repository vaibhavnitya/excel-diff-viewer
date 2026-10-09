export type PropRow = {
  name: string;
  type: string;
  default?: string;
  description: string;
};

export type PropsTableProps = {
  rows: readonly PropRow[];
};

export function PropsTable({ rows }: PropsTableProps) {
  return (
    <div className="my-6 overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium">Type</th>
            <th className="px-3 py-2 text-left font-medium">Default</th>
            <th className="px-3 py-2 text-left font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b align-top">
              <td className="px-3 py-2 font-mono text-xs text-foreground">
                {row.name}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {row.type}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {row.default ?? '—'}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {row.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
