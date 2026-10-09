import type { DiffSchema, Workbook } from '@your-scope/excel-diff-core';

const HEADERS = ['origin', 'destination', 'mode', 'rate'] as const;

/** Sample “before” rate card — 5 rows, 4 columns. */
export const SAMPLE_WORKBOOK_A: Workbook = {
  sheets: [
    {
      name: 'Rates',
      headers: [...HEADERS],
      rows: [
        ['US', 'UK', 'air', 12.5],
        ['US', 'DE', 'ocean', 8.0],
        ['CA', 'UK', 'air', 14.0],
        ['US', '', 'air', 10.0],
        ['MX', 'US', 'truck', 6.25],
      ],
    },
  ],
  activeSheetIndex: 0,
  meta: { format: 'csv', filename: 'rates-before.csv' },
};

/** Sample “after” rate card — added / removed / modified rows. */
export const SAMPLE_WORKBOOK_B: Workbook = {
  sheets: [
    {
      name: 'Rates',
      headers: [...HEADERS],
      rows: [
        ['US', 'UK', 'air', 13.0],
        ['US', 'DE', 'ocean', 8.0],
        ['CA', 'UK', 'air', 14.0],
        ['US', '', 'air', 10.0],
        ['FR', 'US', 'air', 15.5],
      ],
    },
  ],
  activeSheetIndex: 0,
  meta: { format: 'csv', filename: 'rates-after.csv' },
};

export const SAMPLE_SCHEMA: DiffSchema = {
  keyFields: ['origin', 'destination', 'mode'],
  optionalKeyFields: ['destination'],
  valueFields: ['rate'],
  numericTolerance: { absolute: 1e-6, relative: 1e-9 },
};

function workbookToCsv(workbook: Workbook): string {
  const sheet = workbook.sheets[workbook.activeSheetIndex] ?? workbook.sheets[0];
  if (!sheet) return '';
  const lines = [
    sheet.headers.join(','),
    ...sheet.rows.map((row) =>
      row
        .map((cell) => {
          if (cell == null) return '';
          const text = String(cell);
          return text.includes(',') || text.includes('"')
            ? `"${text.replace(/"/g, '""')}"`
            : text;
        })
        .join(','),
    ),
  ];
  return lines.join('\n');
}

/** Build a `File` from an in-memory workbook (CSV bytes). */
export function workbookToFile(
  workbook: Workbook,
  filename = workbook.meta.filename ?? 'sample.csv',
): File {
  const csv = workbookToCsv(workbook);
  return new File([csv], filename, { type: 'text/csv' });
}

export function getSampleFileA(): File {
  return workbookToFile(SAMPLE_WORKBOOK_A, 'rates-before.csv');
}

export function getSampleFileB(): File {
  return workbookToFile(SAMPLE_WORKBOOK_B, 'rates-after.csv');
}

/** Oversized CSV string used to provoke FILE_TOO_LARGE with a tiny limit. */
export function getOversizedCsvFile(sizeBytes = 2048): File {
  const header = 'a,b,c\n';
  const pad = 'x'.repeat(Math.max(0, sizeBytes - header.length));
  return new File([header + pad], 'too-large.csv', { type: 'text/csv' });
}

/** Many-row CSV for TOO_MANY_ROWS / TOO_MANY_CELLS demos. */
export function getManyRowsCsvFile(rowCount: number): File {
  const lines = ['origin,destination,mode,rate'];
  for (let i = 0; i < rowCount; i += 1) {
    lines.push(`US,UK,air,${i}`);
  }
  return new File([lines.join('\n')], 'many-rows.csv', { type: 'text/csv' });
}

/** Wide CSV for TOO_MANY_COLUMNS. */
export function getWideCsvFile(columnCount: number): File {
  const headers = Array.from({ length: columnCount }, (_, i) => `col${i}`);
  const row = headers.map((_, i) => String(i));
  return new File(
    [[headers.join(','), row.join(',')].join('\n')],
    'wide.csv',
    { type: 'text/csv' },
  );
}

export function getUnsupportedFile(): File {
  return new File(['%PDF-1.4 fake'], 'not-excel.pdf', {
    type: 'application/pdf',
  });
}

/** Duplicate business keys for DUPLICATE_KEYS. */
export function getDuplicateKeysFile(): File {
  const csv = [
    'origin,destination,mode,rate',
    'US,UK,air,12.5',
    'US,UK,air,13.0',
  ].join('\n');
  return new File([csv], 'duplicates.csv', { type: 'text/csv' });
}

/** Blank required key field for INVALID_SCHEMA. */
export function getBlankKeyFile(): File {
  const csv = [
    'origin,destination,mode,rate',
    ',UK,air,12.5',
  ].join('\n');
  return new File([csv], 'blank-key.csv', { type: 'text/csv' });
}
