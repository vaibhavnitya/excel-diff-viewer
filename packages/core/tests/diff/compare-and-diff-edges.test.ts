import { describe, expect, it } from 'vitest';
import { valuesEqual, numbersEqual } from '../../src/diff/compare-values.js';
import { diffWorkbooks } from '../../src/diff/diff-workbooks.js';
import { resolveNumericTolerance } from '../../src/defaults.js';
import type { DiffSchema, Workbook } from '../../src/types.js';

const tolerance = resolveNumericTolerance();

function wb(
  headers: string[],
  rows: (string | number | boolean | null)[][],
  filename: string,
): Workbook {
  return {
    sheets: [{ name: 'Sheet1', headers, rows }],
    activeSheetIndex: 0,
    meta: { format: 'csv', filename },
  };
}

describe('valuesEqual edges', () => {
  it('compares numeric strings and uses custom comparator', () => {
    expect(valuesEqual('10', '10.0000001', tolerance)).toBe(true);
    expect(valuesEqual('x', 'y', tolerance)).toBe(false);
    expect(valuesEqual(1, 2, tolerance, () => true)).toBe(true);
    expect(valuesEqual(null, null, tolerance)).toBe(true);
    expect(valuesEqual(true, false, tolerance)).toBe(false);
    expect(asFiniteViaEqual()).toBe(false);
  });

  it('rejects non-numeric strings via number path', () => {
    expect(valuesEqual('abc', 1, tolerance)).toBe(false);
    expect(numbersEqual(1, 1.0000000001, resolveNumericTolerance({ relative: 0 }))).toBe(true);
  });
});

function asFiniteViaEqual(): boolean {
  return valuesEqual('', 0, tolerance);
}

describe('diffWorkbooks edges', () => {
  const schema: DiffSchema = {
    keyFields: ['id'],
    valueFields: ['val'],
  };

  it('errors on missing sheet name', () => {
    const a = wb(['id', 'val'], [['a', 1]], 'a.csv');
    const b = wb(['id', 'val'], [['a', 1]], 'b.csv');
    const result = diffWorkbooks(a, b, { schema, sheetName: 'Nope' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_SCHEMA');
  });

  it('errors on empty keyFields', () => {
    const a = wb(['id', 'val'], [['a', 1]], 'a.csv');
    const b = wb(['id', 'val'], [['a', 1]], 'b.csv');
    const result = diffWorkbooks(a, b, { schema: { keyFields: [], valueFields: ['val'] } });
    expect(result.ok).toBe(false);
  });

  it('defaults valueFields to non-key headers when empty', () => {
    const a = wb(['id', 'val'], [['a', 1]], 'a.csv');
    const b = wb(['id', 'val'], [['a', 2]], 'b.csv');
    const result = diffWorkbooks(a, b, {
      schema: { keyFields: ['id'], valueFields: [] },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.rows[0]?.status).toBe('modified');
  });

  it('skips unknown value fields and reports unchanged', () => {
    const a = wb(['id', 'val'], [['a', 1]], 'a.csv');
    const b = wb(['id', 'val'], [['a', 1]], 'b.csv');
    const result = diffWorkbooks(a, b, {
      schema: { keyFields: ['id'], valueFields: ['missing', 'val'] },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.stats.unchanged).toBe(1);
  });

  it('enforces limits via TOO_MANY_ROWS', () => {
    const a = wb(['id'], [['a'], ['b']], 'a.csv');
    const b = wb(['id'], [['a']], 'b.csv');
    const result = diffWorkbooks(a, b, {
      schema: { keyFields: ['id'], valueFields: [] },
      limits: { maxRows: 1 },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TOO_MANY_ROWS');
  });

  it('errors when active sheet is missing', () => {
    const a: Workbook = {
      sheets: [],
      activeSheetIndex: 0,
      meta: { format: 'csv', filename: 'empty.csv' },
    };
    const b = wb(['id'], [['a']], 'b.csv');
    const result = diffWorkbooks(a, b, { schema });
    expect(result.ok).toBe(false);
  });

  it('errors when sheet is missing on side B', () => {
    const a = wb(['id', 'val'], [['a', 1]], 'a.csv');
    const b: Workbook = {
      sheets: [{ name: 'Other', headers: ['id'], rows: [['a']] }],
      activeSheetIndex: 0,
      meta: { format: 'csv', filename: 'b.csv' },
    };
    const result = diffWorkbooks(a, b, { schema, sheetName: 'Sheet1' });
    expect(result.ok).toBe(false);
  });

  it('surfaces duplicate keys on side B', () => {
    const a = wb(['id', 'val'], [['a', 1]], 'a.csv');
    const b = wb(
      ['id', 'val'],
      [
        ['a', 1],
        ['a', 2],
      ],
      'b.csv',
    );
    const result = diffWorkbooks(a, b, { schema });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('DUPLICATE_KEYS');
    expect(result.error.message).toContain('side b');
  });

  it('falls back to A headers when B has none', () => {
    const a = wb(['id', 'val'], [['a', 1]], 'a.csv');
    const b: Workbook = {
      sheets: [{ name: 'Sheet1', headers: [], rows: [] }],
      activeSheetIndex: 0,
      meta: { format: 'csv', filename: 'b.csv' },
    };
    const result = diffWorkbooks(a, b, { schema });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.headers).toEqual(['id', 'val']);
    expect(result.value.stats.removed).toBe(1);
  });

  it('errors when key field missing from headers', () => {
    const a = wb(['x'], [['a']], 'a.csv');
    const b = wb(['x'], [['a']], 'b.csv');
    const result = diffWorkbooks(a, b, {
      schema: { keyFields: ['id'], valueFields: [] },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_SCHEMA');
  });
});

describe('findDuplicateKeysError without filename', () => {
  it('uses generic File label', async () => {
    const { findDuplicateKeysError } = await import('../../src/diff/detect-duplicate-keys.js');
    const key = 'k' as import('../../src/types.js').RowKey;
    const error = findDuplicateKeysError(
      [
        { key, dataRowIndex: 0 },
        { key, dataRowIndex: 1 },
      ],
      'a',
    );
    expect(error?.message.startsWith('File (side a)')).toBe(true);
  });
});
