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
              height={600} 
              />
          </div>
        </CardContent>
      </Card>

      <PropsPanel code={formatViewerProps(file)} />
    </div>
  );
}
