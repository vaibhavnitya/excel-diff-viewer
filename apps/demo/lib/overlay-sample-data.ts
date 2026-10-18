import type { OverlaySchema, Workbook } from '@mojro/excel-diff-core';

import { workbookToFile } from '@/lib/sample-data';

/** Real-shaped FTL-like rate card (~20 rows) for fn compose demos. */
export const REAL_SHAPED_BASE: Workbook = {
  sheets: [
    {
      name: 'Rate Card',
      headers: [
        'Rate ID',
        'Fleet',
        'Vehicle Type',
        'Unit Rate',
        'Component Type',
        'Surcharge Code',
      ],
      rows: [
        ['R01', 'North', 'Van', 100, 'BASE', ''],
        ['R02', 'North', 'Truck', 200, 'BASE', ''],
        ['R03', 'North', 'Bike', 40, 'BASE', ''],
        ['R04', 'South', 'Van', 110, 'BASE', ''],
        ['R05', 'South', 'Truck', 210, 'BASE', ''],
        ['R06', 'South', 'Bike', 45, 'BASE', ''],
        ['R07', 'East', 'Van', 105, 'BASE', ''],
        ['R08', 'East', 'Truck', 205, 'BASE', ''],
        ['R09', 'West', 'Van', 115, 'BASE', ''],
        ['R10', 'West', 'Truck', 215, 'BASE', ''],
        ['R11', 'North', 'Van', 102, 'BASE', ''],
        ['R12', 'South', 'Van', 112, 'BASE', ''],
        ['R13', 'East', 'Bike', 42, 'BASE', ''],
        ['R14', 'West', 'Bike', 48, 'BASE', ''],
        ['R15', 'Central', 'Van', 108, 'BASE', ''],
        ['R16', 'Central', 'Truck', 208, 'BASE', ''],
        ['R17', 'Central', 'Bike', 44, 'BASE', ''],
        ['R18', 'North', 'Truck', 202, 'BASE', ''],
        ['R19', 'South', 'Truck', 212, 'BASE', ''],
        ['R20', 'East', 'Van', 107, 'BASE', ''],
      ],
    },
  ],
  activeSheetIndex: 0,
  meta: { format: 'csv', filename: 'ftl-rate-card.csv' },
};

/** Surcharge template (~10 rows) paired with {@link REAL_SHAPED_BASE}. */
export const REAL_SHAPED_OVERLAY: Workbook = {
  sheets: [
    {
      name: 'Surcharges',
      headers: ['Vehicle Type', 'Surcharge Type', 'Unit Rate'],
      rows: [
        ['Van', 'FUEL', 12],
        ['Van', 'DETENTION', 50],
        ['Van', 'NIGHT', 25],
        ['Truck', 'FUEL', 18],
        ['Truck', 'DETENTION', 80],
        ['Truck', 'NIGHT', 40],
        ['Bike', 'FUEL', 5],
        ['Bike', 'DETENTION', 20],
        [null, 'NIGHT', 15],
        ['Van', 'FUEL', 12.5],
      ],
    },
  ],
  activeSheetIndex: 0,
  meta: { format: 'csv', filename: 'surcharge-template.csv' },
};

export const realFixtureSchema: OverlaySchema = {
  join: {
    base: ['Vehicle Type'],
    overlay: ['Vehicle Type'],
    wildcardOnEmpty: 'overlay',
  },
  compose: {
    kind: 'fn',
    fn: (baseRow, surchargeRows) => ({
      ...baseRow,
      __ApplicableSurchargeCount: surchargeRows.length,
      __FuelSurchargeSensitivity:
        surchargeRows.find((s) => s['Surcharge Type'] === 'FUEL')?.['Unit Rate'] ??
        null,
      __DetentionPerHour:
        surchargeRows.find((s) => s['Surcharge Type'] === 'DETENTION')?.[
          'Unit Rate'
        ] ?? null,
      __NightSurchargePerTrip:
        surchargeRows.find((s) => s['Surcharge Type'] === 'NIGHT')?.['Unit Rate'] ??
        null,
    }),
  },
  passthrough: 'all',
};

/** Simple synthetic rate card for rules compose. */
export const SIMPLE_BASE: Workbook = {
  sheets: [
    {
      name: 'Rates',
      headers: ['Lane', 'Vehicle Type', 'Base Rate'],
      rows: [
        ['L01', 'Van', 100],
        ['L02', 'Van', 120],
        ['L03', 'Truck', 200],
        ['L04', 'Truck', 220],
        ['L05', 'Bike', 40],
        ['L06', 'Van', 110],
        ['L07', 'Truck', 210],
        ['L08', 'Bike', 45],
        ['L09', 'Van', 105],
        ['L10', 'Truck', 205],
        ['L11', 'Van', 115],
        ['L12', 'Truck', 215],
        ['L13', 'Bike', 42],
        ['L14', 'Van', 125],
        ['L15', 'Truck', 225],
        ['L16', 'Bike', 48],
        ['L17', 'Van', 130],
        ['L18', 'Truck', 230],
        ['L19', 'Van', 135],
        ['L20', 'Truck', 235],
      ],
    },
  ],
  activeSheetIndex: 0,
  meta: { format: 'csv', filename: 'simple-rates.csv' },
};

export const SIMPLE_OVERLAY: Workbook = {
  sheets: [
    {
      name: 'Fuel',
      headers: ['Vehicle Type', 'Fuel Pct'],
      rows: [
        ['Van', 5],
        ['Truck', 8],
        ['Bike', 3],
      ],
    },
  ],
  activeSheetIndex: 0,
  meta: { format: 'csv', filename: 'simple-surcharge.csv' },
};

export const simpleFixtureSchema: OverlaySchema = {
  join: {
    base: ['Vehicle Type'],
    overlay: ['Vehicle Type'],
    wildcardOnEmpty: 'overlay',
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
  passthrough: 'all',
};

export function getRealShapedBaseFile(): File {
  return workbookToFile(REAL_SHAPED_BASE, 'ftl-rate-card.csv');
}

export function getRealShapedOverlayFile(): File {
  return workbookToFile(REAL_SHAPED_OVERLAY, 'surcharge-template.csv');
}

export function getSimpleBaseFile(): File {
  return workbookToFile(SIMPLE_BASE, 'simple-rates.csv');
}

export function getSimpleOverlayFile(): File {
  return workbookToFile(SIMPLE_OVERLAY, 'simple-surcharge.csv');
}
