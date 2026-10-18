'use client';

import { ExcelOverlayViewer } from '@mojro/excel-diff-ui';
import type { OverlaySchema } from '@mojro/excel-diff-core';
import { useMemo } from 'react';

import {
  getRealShapedBaseFile,
  getRealShapedOverlayFile,
  getSimpleBaseFile,
  getSimpleOverlayFile,
  realFixtureSchema,
} from '@/lib/overlay-sample-data';
import { workbookToFile } from '@/lib/sample-data';

const fuelSchema: OverlaySchema = {
  join: {
    base: ['Vehicle Type'],
    overlay: ['Vehicle Type'],
    wildcardOnEmpty: 'none',
  },
  compose: {
    kind: 'rules',
    rules: [
      {
        op: 'percentIncrease',
        base: 'Base Rate',
        overlay: 'Fuel Pct',
        target: 'Effective Rate',
        defaultWhenMissing: 0,
      },
    ],
  },
};

const feeAndFuelSchema: OverlaySchema = {
  join: {
    base: ['Vehicle Type'],
    overlay: ['Vehicle Type'],
    wildcardOnEmpty: 'none',
  },
  compose: {
    kind: 'rules',
    rules: [
      {
        op: 'add',
        base: 'Base Rate',
        overlay: 'Handling Fee',
        target: 'With Handling',
        defaultWhenMissing: 0,
      },
      {
        op: 'percentIncrease',
        base: 'Base Rate',
        overlay: 'Fuel Pct',
        target: 'With Fuel',
        defaultWhenMissing: 0,
      },
    ],
  },
};

function feeOverlayFile(): File {
  return workbookToFile(
    {
      sheets: [
        {
          name: 'Fees',
          headers: ['Vehicle Type', 'Fuel Pct', 'Handling Fee'],
          rows: [
            ['Van', 5, 10],
            ['Truck', 8, 20],
            ['Bike', 3, 5],
          ],
        },
      ],
      activeSheetIndex: 0,
      meta: { format: 'csv', filename: 'fee-and-fuel.csv' },
    },
    'fee-and-fuel.csv',
  );
}

export function FlatFuelDemo() {
  const base = useMemo(() => getSimpleBaseFile(), []);
  const overlay = useMemo(() => getSimpleOverlayFile(), []);
  return (
    <div className="my-4 overflow-hidden rounded-md border">
      <ExcelOverlayViewer
        baseFile={base}
        overlayFile={overlay}
        options={{ schema: fuelSchema }}
        height={280}
      />
    </div>
  );
}

export function FeeAndFuelDemo() {
  const base = useMemo(() => getSimpleBaseFile(), []);
  const overlay = useMemo(() => feeOverlayFile(), []);
  return (
    <div className="my-4 overflow-hidden rounded-md border">
      <ExcelOverlayViewer
        baseFile={base}
        overlayFile={overlay}
        options={{ schema: feeAndFuelSchema }}
        height={280}
      />
    </div>
  );
}

export function RealShapedDemo() {
  const base = useMemo(() => getRealShapedBaseFile(), []);
  const overlay = useMemo(() => getRealShapedOverlayFile(), []);
  return (
    <div className="my-4 overflow-hidden rounded-md border">
      <ExcelOverlayViewer
        baseFile={base}
        overlayFile={overlay}
        options={{ schema: realFixtureSchema }}
        height={320}
      />
    </div>
  );
}
