'use client';

import { ExcelOverlayViewer } from '@mojro/excel-diff-ui';
import { useMemo } from 'react';

import {
  getSimpleBaseFile,
  getSimpleOverlayFile,
  simpleFixtureSchema,
} from '@/lib/overlay-sample-data';

/** Compact in-docs overlay viewer for the simple fuel-surcharge schema. */
export function OverlaySchemaDemo() {
  const base = useMemo(() => getSimpleBaseFile(), []);
  const overlay = useMemo(() => getSimpleOverlayFile(), []);
  const options = useMemo(
    () => ({ schema: simpleFixtureSchema }),
    [],
  );

  return (
    <div className="my-4 overflow-hidden rounded-md border">
      <ExcelOverlayViewer
        baseFile={base}
        overlayFile={overlay}
        options={options}
        height={280}
      />
    </div>
  );
}
