'use client';

import {
  useExcelOverlay,
  useWorkbookSummary,
} from '@mojro/excel-diff-react';
import {
  ExcelOverlayViewer,
  OverlaySummary,
  WorkbookSummary,
} from '@mojro/excel-diff-ui';
import { useMemo, useState } from 'react';

import { rechartsRenderers } from '@/app/analytics/chart-renderers';
import {
  getRealShapedBaseFile,
  getRealShapedOverlayFile,
  realFixtureSchema,
} from '@/lib/overlay-sample-data';
import { SAMPLE_WORKBOOK_A } from '@/lib/sample-data';

export function WorkbookSummaryDefaultsDemo() {
  const state = useWorkbookSummary(SAMPLE_WORKBOOK_A);

  if (state.status !== 'success') {
    return <p className="text-sm text-muted-foreground">Summarizing…</p>;
  }

  return (
    <div className="my-4 rounded-md border bg-background p-3">
      <WorkbookSummary summary={state.summary} />
    </div>
  );
}

export function OverlayWithSummaryDemo() {
  const baseFile = useMemo(() => getRealShapedBaseFile(), []);
  const overlayFile = useMemo(() => getRealShapedOverlayFile(), []);
  const options = useMemo(() => ({ schema: realFixtureSchema }), []);
  const state = useExcelOverlay(baseFile, overlayFile, options);

  return (
    <div className="my-4 grid gap-3 lg:grid-cols-2">
      <div className="min-h-[280px] rounded-md border p-2">
        <ExcelOverlayViewer
          baseFile={baseFile}
          overlayFile={overlayFile}
          options={options}
          height={280}
        />
      </div>
      {state.status === 'success' ? (
        <div className="rounded-md border bg-background p-3">
          <OverlaySummary summary={state.summary} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Computing overlay…</p>
      )}
    </div>
  );
}

export function RechartsEscapeHatchDemo() {
  const state = useWorkbookSummary(SAMPLE_WORKBOOK_A);
  const [showCharts, setShowCharts] = useState(true);

  if (state.status !== 'success') {
    return <p className="text-sm text-muted-foreground">Summarizing…</p>;
  }

  return (
    <div className="my-4 space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showCharts}
          onChange={(e) => setShowCharts(e.target.checked)}
        />
        Use Recharts renderers (demo dependency only)
      </label>
      <div className="rounded-md border bg-background p-3">
        <WorkbookSummary
          summary={state.summary}
          renderers={showCharts ? rechartsRenderers : undefined}
        />
      </div>
    </div>
  );
}
