import type { DiffSchema, Workbook } from '../../src/types.js';

/** Load a repo fixture via Vite-served URL (browser-safe; no `fs`). */
export async function loadFixture(relativePath: string): Promise<ArrayBuffer> {
  const url = new URL(`../../../../fixtures/${relativePath}`, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch fixture ${relativePath}: ${response.status}`);
  }
  return response.arrayBuffer();
}

export const rateSchema: DiffSchema = {
  keyFields: ['origin', 'destination'],
  valueFields: ['base_rate', 'min_charge'],
  optionalKeyFields: ['origin'],
};

/** Dense synthetic workbook for cancel / progress stress tests. */
export function syntheticWorkbook(rowCount: number, filename: string): Workbook {
  const rows = Array.from({ length: rowCount }, (_, i) => [String(i), i] as const).map((r) => [
    r[0],
    r[1],
  ]);
  return {
    sheets: [
      {
        name: 'Sheet1',
        headers: ['id', 'val'],
        rows,
      },
    ],
    activeSheetIndex: 0,
    meta: { format: 'csv', filename },
  };
}

export const syntheticSchema: DiffSchema = {
  keyFields: ['id'],
  valueFields: ['val'],
};
