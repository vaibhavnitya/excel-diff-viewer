'use client';

import { useState } from 'react';
import { ExcelViewer } from '@mojro/excel-diff-ui';

import { FileUpload } from '@/components/file-upload';
import { formatViewerProps, PropsPanel } from '@/components/props-panel';
import { Card, CardContent } from '@/components/ui/card';

export default function ViewerPage() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Viewer</h1>
        <p className="text-muted-foreground">
          Upload an Excel or CSV file to see it rendered as a sortable,
          searchable grid.
        </p>
      </div>

      <FileUpload
        label="File"
        file={file}
        onFileChange={setFile}
        className="w-full max-w-xl"
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="min-h-[360px] p-2 sm:min-h-[600px]">
            <ExcelViewer 
              file={file}
              height={700} 
              theme={{
                colors: {
                  added: '#dcedc8',       // custom green
                  removed: '#ffcdd2',     // custom red
                  modified: '#fff59d',    // custom yellow
                  headerBg: '#1976d2',    // blue header
                  headerFg: '#ffffff',
                },
                typography: {
                  fontFamily: '"Comic Sans MS", sans-serif',
                  fontSize: 16,           // number, should become "16px"
                },
                spacing: {
                  rowHeight: 48,          // taller rows
                  headerHeight: 56,
                }
              }}
              />
          </div>
        </CardContent>
      </Card>

      <PropsPanel code={formatViewerProps(file)} />
    </div>
  );
}
