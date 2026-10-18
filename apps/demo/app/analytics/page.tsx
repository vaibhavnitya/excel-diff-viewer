'use client';

import type {
  DiffResult,
  DiffSchema,
  OverlaySummary as OverlaySummaryData,
  Workbook,
} from '@mojro/excel-diff-core';
import {
  useExcelFile,
  useExcelOverlay,
  useWorkbookSummary,
} from '@mojro/excel-diff-react';
import {
  DiffSummary,
  ExcelDiffViewer,
  ExcelOverlayViewer,
  OverlaySummary,
  WorkbookSummary,
  type SummaryRenderers,
} from '@mojro/excel-diff-ui';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import { FileUpload } from '@/components/file-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getRealShapedBaseFile,
  getRealShapedOverlayFile,
  realFixtureSchema,
} from '@/lib/overlay-sample-data';
import {
  getSampleFileA,
  getSampleFileB,
  SAMPLE_SCHEMA,
  SAMPLE_WORKBOOK_A,
} from '@/lib/sample-data';

import { rechartsRenderers } from './chart-renderers';

type RenderMode = 'default' | 'recharts';

export default function AnalyticsPage() {
  const [mode, setMode] = useState<RenderMode>('default');
  const renderers: SummaryRenderers | undefined =
    mode === 'recharts' ? rechartsRenderers : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="max-w-3xl space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          The library ships summary components with built-in rendering — no chart
          dependencies. Toggle to Recharts to see the escape hatch pattern: pass a{' '}
          <code className="text-xs">renderers</code> prop on{' '}
          <code className="text-xs">WorkbookSummary</code> /{' '}
          <code className="text-xs">OverlaySummary</code> with your own chart
          implementations. <code className="text-xs">DiffSummary</code> uses a
          fixed field-change layout and does not take{' '}
          <code className="text-xs">renderers</code>.
        </p>
        <p className="text-sm text-muted-foreground">
          Recharts is a demo-only dependency and is not required to use the
          library. See{' '}
          <Link href="/docs/analytics/examples" className="underline">
            /docs/analytics/examples
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Rendering:</span>
        <div className="inline-flex rounded-md border p-0.5">
          <Button
            type="button"
            size="sm"
            variant={mode === 'default' ? 'default' : 'ghost'}
            onClick={() => setMode('default')}
          >
            Default
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'recharts' ? 'default' : 'ghost'}
            onClick={() => setMode('recharts')}
          >
            Recharts
          </Button>
        </div>
      </div>

      <Tabs defaultValue="workbook">
        <TabsList>
          <TabsTrigger value="workbook">Workbook</TabsTrigger>
          <TabsTrigger value="diff">Diff</TabsTrigger>
          <TabsTrigger value="overlay">Overlay</TabsTrigger>
        </TabsList>

        <TabsContent value="workbook" className="space-y-4 pt-4">
          <WorkbookPanel renderers={renderers} />
        </TabsContent>
        <TabsContent value="diff" className="space-y-4 pt-4">
          <DiffPanel />
        </TabsContent>
        <TabsContent value="overlay" className="space-y-4 pt-4">
          <OverlayPanel renderers={renderers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WorkbookPanel({
  renderers,
}: {
  readonly renderers?: SummaryRenderers;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [sample, setSample] = useState<Workbook | null>(null);

  const fileState = useExcelFile(sample ? null : file);
  const workbook =
    sample ??
    (fileState.status === 'success' ? fileState.workbook : null);

  const summaryState = useWorkbookSummary(workbook);

  const loadSample = useCallback(() => {
    setFile(null);
    setSample(SAMPLE_WORKBOOK_A);
  }, []);

  const onFileChange = useCallback((next: File | null) => {
    setSample(null);
    setFile(next);
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <FileUpload label="Workbook" file={file} onFileChange={onFileChange} />
        <Button type="button" variant="secondary" onClick={loadSample}>
          Load sample
        </Button>
      </div>
      {summaryState.status === 'success' ? (
        <Card>
          <CardContent className="p-4">
            <WorkbookSummary
              summary={summaryState.summary}
              renderers={renderers}
            />
          </CardContent>
        </Card>
      ) : summaryState.status === 'error' ? (
        <p className="text-sm text-destructive">{summaryState.error.message}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Upload a file or load the sample rate card.
        </p>
      )}
    </>
  );
}

function DiffPanel() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [schema, setSchema] = useState<DiffSchema | null>(null);
  const [summary, setSummary] = useState<DiffResult['summary'] | null>(null);

  const loadSample = useCallback(() => {
    setSummary(null);
    setFileA(getSampleFileA());
    setFileB(getSampleFileB());
    setSchema(SAMPLE_SCHEMA);
  }, []);

  const onDiffComplete = useCallback((diff: DiffResult) => {
    setSummary(diff.summary);
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <FileUpload label="File A" file={fileA} onFileChange={setFileA} />
        <FileUpload label="File B" file={fileB} onFileChange={setFileB} />
        <Button type="button" variant="secondary" onClick={loadSample}>
          Load sample
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardContent className="p-2">
            <ExcelDiffViewer
              fileA={fileA}
              fileB={fileB}
              schema={schema}
              height={360}
              onDiffComplete={onDiffComplete}
            />
          </CardContent>
        </Card>
        {summary !== null ? (
          <Card>
            <CardContent className="p-4">
              <DiffSummary summary={summary} />
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            Load a sample pair or upload two files to see the diff summary.
          </p>
        )}
      </div>
    </>
  );
}

function OverlayPanel({
  renderers,
}: {
  readonly renderers?: SummaryRenderers;
}) {
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [overlayFile, setOverlayFile] = useState<File | null>(null);

  const options = useMemo(() => ({ schema: realFixtureSchema }), []);

  const loadSample = useCallback(() => {
    setBaseFile(getRealShapedBaseFile());
    setOverlayFile(getRealShapedOverlayFile());
  }, []);

  const overlayState = useExcelOverlay(baseFile, overlayFile, options);
  const summary: OverlaySummaryData | null =
    overlayState.status === 'success' ? overlayState.summary : null;

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <FileUpload
          label="Base"
          file={baseFile}
          onFileChange={setBaseFile}
        />
        <FileUpload
          label="Overlay"
          file={overlayFile}
          onFileChange={setOverlayFile}
        />
        <Button type="button" variant="secondary" onClick={loadSample}>
          Load sample
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardContent className="p-2">
            <ExcelOverlayViewer
              baseFile={baseFile}
              overlayFile={overlayFile}
              options={options}
              height={360}
            />
          </CardContent>
        </Card>
        {summary !== null ? (
          <Card>
            <CardContent className="p-4">
              <OverlaySummary summary={summary} renderers={renderers} />
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            Load the real-shaped sample to see overlay summary side-by-side.
          </p>
        )}
      </div>
    </>
  );
}
