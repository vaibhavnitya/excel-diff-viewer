'use client';

import { ExcelOverlayViewer } from '@mojro/excel-diff-ui';
import type { OverlayWorkbooksOptions } from '@mojro/excel-diff-core';
import Link from 'next/link';
import { useMemo } from 'react';

import { FileUpload } from '@/components/file-upload';
import { OverlaySchemaEditor } from '@/components/overlay-schema-editor';
import { Card, CardContent } from '@/components/ui/card';
import { useOverlayPageState } from '@/lib/use-overlay-page-state';

export default function OverlayPage() {
  const {
    baseFile,
    overlayFile,
    fixture,
    schema,
    loadFixture,
    onBaseFileChange,
    onOverlayFileChange,
    applySchema,
  } = useOverlayPageState();

  const options: OverlayWorkbooksOptions | null = useMemo(
    () => (schema === null ? null : { schema }),
    [schema],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Overlay</h1>
        <p className="text-muted-foreground">
          Overlay joins two workbooks and produces a derived one. You declare how
          to match rows (join columns) and how to combine them (rules for simple
          arithmetic, or a function for custom logic). The library does not know
          what a rate card is — it does what your schema says.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Load sample fixture</span>
          <select
            className="block rounded-md border bg-background px-3 py-2"
            value={fixture}
            onChange={(e) => {
              loadFixture(e.target.value as 'none' | 'real' | 'simple');
            }}
          >
            <option value="none">—</option>
            <option value="real">Real: FTL rate card + surcharge</option>
            <option value="simple">
              Simple: synthetic rate card + fuel surcharge
            </option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FileUpload
          label="Base workbook"
          file={baseFile}
          onFileChange={onBaseFileChange}
        />
        <FileUpload
          label="Overlay workbook"
          file={overlayFile}
          onFileChange={onOverlayFileChange}
        />
      </div>

      {schema !== null ? (
        <OverlaySchemaEditor schema={schema} onApply={applySchema} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Upload both workbooks (or load a sample) to get an assisted schema you
          can edit.
        </p>
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="min-h-[360px] p-2 sm:min-h-[600px]">
            <ExcelOverlayViewer
              baseFile={baseFile}
              overlayFile={overlayFile}
              options={options}
              height={600}
            />
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Read more in the{' '}
        <Link href="/docs/overlay/overview" className="underline">
          overlay docs
        </Link>
        .
      </p>
    </div>
  );
}
