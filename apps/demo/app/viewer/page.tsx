'use client';

import { useState } from 'react';
import { ExcelViewer, type ExportMode } from '@mojro/excel-diff-ui';

import { ExportModeToggle } from '@/components/export-mode-toggle';
import { FileUpload } from '@/components/file-upload';
import { formatViewerProps, PropsPanel } from '@/components/props-panel';
import { Card, CardContent } from '@/components/ui/card';

export default function ViewerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [exportMode, setExportMode] = useState<ExportMode>('current-view');

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Viewer</h1>
        <p className="text-muted-foreground">
          Upload an Excel or CSV file to see it rendered as a sortable,
          searchable grid.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <FileUpload
          label="File"
          file={file}
          onFileChange={setFile}
          className="w-full max-w-xl"
        />
        <ExportModeToggle value={exportMode} onChange={setExportMode} />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="min-h-[360px] p-2 sm:min-h-[600px]">
            <ExcelViewer
              file={file}
              height={700}
              exportMode={exportMode}
              theme={{
                colors: {
                  added: '#dcedc8',
                  removed: '#ffcdd2',
                  modified: '#fff59d',
                  headerBg: '#1976d2',
                  headerFg: '#ffffff',
                },
                typography: {
                  fontFamily: '"Comic Sans MS", sans-serif',
                  fontSize: 16,
                },
                spacing: {
                  rowHeight: 48,
                  headerHeight: 56,
                },
              }}
            />
          </div>
        </CardContent>
      </Card>

      <PropsPanel code={formatViewerProps(file)} />
    </div>
  );
}
