'use client';

import { useState } from 'react';
import { ExcelSplitViewer, type ExportMode } from '@mojro/excel-diff-ui';

import { ExportModeToggle } from '@/components/export-mode-toggle';
import { FileUpload } from '@/components/file-upload';
import { formatSplitProps, PropsPanel } from '@/components/props-panel';
import { SchemaEditor } from '@/components/schema-editor';
import { Card, CardContent } from '@/components/ui/card';
import { useDiffPageState } from '@/lib/use-diff-page-state';

export default function SplitPage() {
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
  const [exportMode, setExportMode] = useState<ExportMode>('current-view');

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Split</h1>
        <p className="text-muted-foreground">
          View two files side by side with rows aligned by their shared keys.
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

      <div className="flex flex-wrap items-end gap-4">
        <SchemaEditor
          headers={headers}
          schema={schema}
          inferredSchema={inferredSchema}
          onSchemaChange={setSchema}
        />
        <ExportModeToggle value={exportMode} onChange={setExportMode} />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="min-h-[360px] overflow-x-auto p-2 sm:min-h-[600px]">
            <ExcelSplitViewer
              fileA={fileA}
              fileB={fileB}
              schema={schema}
              height={600}
              exportMode={exportMode}
            />
          </div>
        </CardContent>
      </Card>

      <PropsPanel code={formatSplitProps(fileA, fileB, schema)} />
    </div>
  );
}
