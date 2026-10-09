'use client';

import { ExcelDiffViewer } from '@your-scope/excel-diff-ui';

import { FileUpload } from '@/components/file-upload';
import { formatDiffProps, PropsPanel } from '@/components/props-panel';
import { SchemaEditor } from '@/components/schema-editor';
import { Card, CardContent } from '@/components/ui/card';
import { useDiffPageState } from '@/lib/use-diff-page-state';

export default function DiffPage() {
  const {
    fileA,
    setFileA,
    fileB,
    setFileB,
    schema,
    setSchema,
    inferredSchema,
    headers,
  } = useDiffPageState();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Diff</h1>
        <p className="text-muted-foreground">
          Upload two files to see what changed between them. Configure how rows
          are matched using the schema editor.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FileUpload
          label="File A — before"
          file={fileA}
          onFileChange={setFileA}
        />
        <FileUpload
          label="File B — after"
          file={fileB}
          onFileChange={setFileB}
        />
      </div>

      <SchemaEditor
        headers={headers}
        schema={schema}
        inferredSchema={inferredSchema}
        onSchemaChange={setSchema}
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="min-h-[360px] p-2 sm:min-h-[600px]">
            <ExcelDiffViewer
              fileA={fileA}
              fileB={fileB}
              schema={schema}
              height={600}
            />
          </div>
        </CardContent>
      </Card>

      <PropsPanel code={formatDiffProps(fileA, fileB, schema)} />
    </div>
  );
}
