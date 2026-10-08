import { describe, expect, it } from 'vitest';
import { parseFile } from '../../src/parsers/parse-file.js';
import { loadFixture } from '../fixtures/load-fixture.js';

describe('parseFile', () => {
  it('parses small.xlsx into a typed workbook', async () => {
    const bytes = loadFixture('small.xlsx');
    const result = await parseFile(bytes, { filename: 'small.xlsx' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.meta.format).toBe('xlsx');
    expect(result.value.sheets[0]?.headers).toEqual([
      'id',
      'name',
      'qty',
      'price',
      'active',
    ]);
    expect(result.value.sheets[0]?.rows).toHaveLength(10);
    expect(result.value.sheets[0]?.rows[0]?.[1]).toBe('alpha');
  });

  it('parses small.csv with the same shape', async () => {
    const bytes = loadFixture('small.csv');
    const result = await parseFile(bytes, { filename: 'small.csv' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.meta.format).toBe('csv');
    expect(result.value.sheets[0]?.rows).toHaveLength(10);
    expect(result.value.sheets[0]?.headers[1]).toBe('name');
  });

  it('respects format override', async () => {
    const bytes = loadFixture('small.csv');
    const result = await parseFile(bytes, { filename: 'mystery.bin', format: 'csv' });
    expect(result.ok).toBe(true);
  });

  it('returns FILE_TOO_LARGE when over limit', async () => {
    const bytes = loadFixture('small.xlsx');
    const result = await parseFile(bytes, {
      filename: 'small.xlsx',
      limits: { maxFileSizeBytes: 10 },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('FILE_TOO_LARGE');
  });

  it('returns UNSUPPORTED_FORMAT for empty unknown bytes', async () => {
    const result = await parseFile(new Uint8Array([0, 1, 2, 3, 4]));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('UNSUPPORTED_FORMAT');
  });
});
