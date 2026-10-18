'use client';

import { ExcelOverlayViewer } from '@mojro/excel-diff-ui';
import type { OverlaySchema, OverlayWorkbooksOptions } from '@mojro/excel-diff-core';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { FileUpload } from '@/components/file-upload';
import { Card, CardContent } from '@/components/ui/card';
import {
  getRealShapedBaseFile,
  getRealShapedOverlayFile,
  getSimpleBaseFile,
  getSimpleOverlayFile,
  realFixtureSchema,
  simpleFixtureSchema,
} from '@/lib/overlay-sample-data';

type FixtureId = 'none' | 'real' | 'simple';

export default function OverlayPage() {
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [overlayFile, setOverlayFile] = useState<File | null>(null);
  const [fixture, setFixture] = useState<FixtureId>('none');
  const [schema, setSchema] = useState<OverlaySchema | null>(null);

  const options: OverlayWorkbooksOptions | null = useMemo(
    () => (schema === null ? null : { schema }),
    [schema],
  );

  const loadFixture = (id: FixtureId): void => {
    setFixture(id);
    if (id === 'real') {
      setBaseFile(getRealShapedBaseFile());
      setOverlayFile(getRealShapedOverlayFile());
      setSchema(realFixtureSchema);
      return;
    }
    if (id === 'simple') {
      setBaseFile(getSimpleBaseFile());
      setOverlayFile(getSimpleOverlayFile());
      setSchema(simpleFixtureSchema);
      return;
    }
    setBaseFile(null);
    setOverlayFile(null);
    setSchema(null);
  };

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
              loadFixture(e.target.value as FixtureId);
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
          onFileChange={(file) => {
            setFixture('none');
            setBaseFile(file);
          }}
        />
        <FileUpload
          label="Overlay workbook"
          file={overlayFile}
          onFileChange={(file) => {
            setFixture('none');
            setOverlayFile(file);
          }}
        />
      </div>

      {schema !== null ? (
        <Card>
          <CardContent className="space-y-2 p-4">
            <h2 className="text-sm font-medium">Schema used</h2>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(
                {
                  join: schema.join,
                  compose:
                    schema.compose.kind === 'rules'
                      ? schema.compose
                      : { kind: 'fn', fn: '<ComposeFn>' },
                  passthrough: schema.passthrough ?? 'all',
                },
                null,
                2,
              )}
            </pre>
          </CardContent>
        </Card>
      ) : null}

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
