import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface PropsPanelProps {
  title?: string;
  code: string;
}

export function PropsPanel({ title = 'Props used', code }: PropsPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
          <code>{code}</code>
        </pre>
      </CardContent>
    </Card>
  );
}

function formatFileLiteral(file: File | null, name: string): string {
  return file ? name : 'null';
}

function formatSchema(schema: {
  keyFields: readonly string[];
  valueFields: readonly string[];
  optionalKeyFields?: readonly string[];
  numericTolerance?:
    | number
    | { absolute?: number; relative?: number };
} | null): string {
  if (!schema) return 'null';

  const lines = [
    '    {',
    `      keyFields: ${JSON.stringify([...schema.keyFields])},`,
  ];
  if (schema.optionalKeyFields && schema.optionalKeyFields.length > 0) {
    lines.push(
      `      optionalKeyFields: ${JSON.stringify([...schema.optionalKeyFields])},`,
    );
  }
  lines.push(`      valueFields: ${JSON.stringify([...schema.valueFields])},`);
  if (schema.numericTolerance !== undefined) {
    lines.push(
      `      numericTolerance: ${JSON.stringify(schema.numericTolerance)},`,
    );
  }
  lines.push('    }');
  return lines.join('\n');
}

export function formatViewerProps(file: File | null, height = 600): string {
  const fileComment = file ? `\n  // file: ${file.name}` : '';
  return `<ExcelViewer${fileComment}
  file={${formatFileLiteral(file, 'file')}}
  height={${height}}
/>`;
}

export function formatDiffProps(
  fileA: File | null,
  fileB: File | null,
  schema: Parameters<typeof formatSchema>[0],
  height = 600,
): string {
  const comments = [
    fileA ? `  // fileA: ${fileA.name}` : null,
    fileB ? `  // fileB: ${fileB.name}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  const commentBlock = comments ? `\n${comments}` : '';
  return `<ExcelDiffViewer${commentBlock}
  fileA={${formatFileLiteral(fileA, 'fileA')}}
  fileB={${formatFileLiteral(fileB, 'fileB')}}
  schema={${formatSchema(schema)}}
  height={${height}}
/>`;
}

export function formatSplitProps(
  fileA: File | null,
  fileB: File | null,
  schema: Parameters<typeof formatSchema>[0],
  height = 600,
): string {
  const comments = [
    fileA ? `  // fileA: ${fileA.name}` : null,
    fileB ? `  // fileB: ${fileB.name}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  const commentBlock = comments ? `\n${comments}` : '';
  return `<ExcelSplitViewer${commentBlock}
  fileA={${formatFileLiteral(fileA, 'fileA')}}
  fileB={${formatFileLiteral(fileB, 'fileB')}}
  schema={${formatSchema(schema)}}
  height={${height}}
/>`;
}
