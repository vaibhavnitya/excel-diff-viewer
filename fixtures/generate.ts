/**
 * Reproducible fixture generator for Phase 1 tests.
 * Run: npx tsx fixtures/generate.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const root = join(dirname(fileURLToPath(import.meta.url)));

function writeXlsx(relativePath: string, rows: unknown[][], sheetName = 'Sheet1'): void {
  const abs = join(root, relativePath);
  mkdirSync(dirname(abs), { recursive: true });
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, sheetName);
  XLSX.writeFile(wb, abs);
  console.log('wrote', relativePath);
}

function writeCsv(relativePath: string, rows: unknown[][]): void {
  const abs = join(root, relativePath);
  mkdirSync(dirname(abs), { recursive: true });
  const lines = rows.map((row) =>
    row
      .map((cell) => {
        if (cell === null || cell === undefined) {
          return '';
        }
        const s = String(cell);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(','),
  );
  writeFileSync(abs, `${lines.join('\n')}\n`, 'utf8');
  console.log('wrote', relativePath);
}

const smallHeaders = ['id', 'name', 'qty', 'price', 'active'];
const smallRows = [
  smallHeaders,
  [1, 'alpha', 10, 1.5, true],
  [2, 'bravo', 20, 2.5, false],
  [3, 'charlie', 30, 3.5, true],
  [4, 'delta', 40, 4.5, true],
  [5, 'echo', 50, 5.5, false],
  [6, 'foxtrot', 60, 6.5, true],
  [7, 'golf', 70, 7.5, true],
  [8, 'hotel', 80, 8.5, false],
  [9, 'india', 90, 9.5, true],
  [10, 'juliet', 100, 10.5, true],
];

writeXlsx('small.xlsx', smallRows);
writeCsv('small.csv', smallRows);

/**
 * Rate cards: origin (optional wildcard), destination, base_rate, min_charge
 *
 * v1:
 *  - specific US/NYC, US/LAX, UK/LON, CA/TOR
 *  - wildcard origin (blank) → EU  (key `*|eu` after normalize)
 *
 * v2:
 *  - 2 modified rates (NYC base_rate, LAX min_charge)
 *  - 1 added (MX/MEX)
 *  - 1 removed (CA/TOR)
 *  - wildcard-origin EU row still present (exact key `*|eu`), base_rate modified
 */
const rateHeaders = ['origin', 'destination', 'base_rate', 'min_charge'];

const rateV1 = [
  rateHeaders,
  ['US', 'NYC', 10.0, 5.0],
  ['US', 'LAX', 12.0, 5.0],
  [null, 'EU', 20.0, 8.0],
  ['UK', 'LON', 15.0, 6.0],
  ['CA', 'TOR', 11.0, 5.0],
];

const rateV2 = [
  rateHeaders,
  ['US', 'NYC', 10.5, 5.0],
  ['US', 'LAX', 12.0, 5.5],
  [null, 'EU', 22.0, 8.0],
  ['UK', 'LON', 15.0, 6.0],
  ['MX', 'MEX', 9.0, 4.0],
];

writeXlsx('rate-card-v1.xlsx', rateV1);
writeXlsx('rate-card-v2.xlsx', rateV2);
writeCsv('rate-card-v1.csv', rateV1);
writeCsv('rate-card-v2.csv', rateV2);

writeXlsx('edge-cases/duplicate-keys.xlsx', [
  rateHeaders,
  ['US', 'NYC', 10.0, 5.0],
  ['US', 'NYC', 11.0, 5.0],
]);

writeXlsx('edge-cases/empty-fields.xlsx', [
  rateHeaders,
  ['US', 'NYC', 10.0, null],
  [null, 'EU', null, 8.0],
  ['UK', '', 15.0, 6.0],
]);

// ---------------------------------------------------------------------------
// Overlay fixtures (Phase 7a) — synthetic; real xlsx may be added later.
// ---------------------------------------------------------------------------

const simpleRateHeaders = ['Lane', 'Vehicle Type', 'Base Rate'];
const simpleRateRows = [
  simpleRateHeaders,
  ['L1', 'Van', 100],
  ['L2', 'Van', 120],
  ['L3', 'Truck', 200],
  ['L4', 'Truck', 220],
  ['L5', 'Bike', 40],
];

const simpleSurchargeHeaders = ['Vehicle Type', 'Fuel Pct'];
const simpleSurchargeRows = [
  simpleSurchargeHeaders,
  ['Van', 5],
  ['Truck', 8],
  // Bike unmatched on purpose
];

writeXlsx('overlay/rate-card-simple-base.xlsx', simpleRateRows);
writeXlsx('overlay/rate-card-simple-overlay.xlsx', simpleSurchargeRows);
writeCsv('overlay/simple-rates.csv', simpleRateRows);
writeCsv('overlay/simple-surcharge.csv', simpleSurchargeRows);

const realShapedBaseHeaders = [
  'Rate ID',
  'Fleet',
  'Vehicle Type',
  'Unit Rate',
  'Component Type',
  'Surcharge Code',
];
const realShapedBaseRows = [
  realShapedBaseHeaders,
  ['R1', 'North', 'Van', 100, 'BASE', ''],
  ['R2', 'North', 'Truck', 200, 'BASE', ''],
  ['R3', 'South', 'Van', 110, 'BASE', ''],
  ['R4', 'South', 'Bike', 45, 'BASE', ''],
  ['R5', 'East', 'Truck', 210, 'BASE', ''],
];

const realShapedOverlayHeaders = [
  'Vehicle Type',
  'Surcharge Type',
  'Unit Rate',
];
const realShapedOverlayRows = [
  realShapedOverlayHeaders,
  ['Van', 'FUEL', 12],
  ['Van', 'DETENTION', 50],
  ['Van', 'NIGHT', 25],
  ['Truck', 'FUEL', 18],
  ['Truck', 'DETENTION', 80],
  ['Bike', 'FUEL', 5],
  // empty Vehicle Type → wildcard match all base rows when wildcardOnEmpty=overlay
  [null, 'NIGHT', 15],
];

writeXlsx('overlay/rate-card-real-base.xlsx', realShapedBaseRows);
writeXlsx('overlay/rate-card-real-overlay.xlsx', realShapedOverlayRows);

console.log('fixtures generated');
