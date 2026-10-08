import { describe, expect, it } from 'vitest';
import { buildKey } from '../../src/key/build-key.js';
import type { DiffSchema } from '../../src/types.js';

const schema: DiffSchema = {
  keyFields: ['origin', 'destination'],
  valueFields: ['base_rate'],
  optionalKeyFields: ['origin'],
};

describe('buildKey', () => {
  it('joins normalized key segments', () => {
    const result = buildKey(['us', 'nyc'], {
      headers: ['origin', 'destination', 'base_rate'],
      schema,
      dataRowIndex: 0,
      filename: 'rates.xlsx',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe('us|nyc');
  });

  it('uses * for blank optional key fields', () => {
    const result = buildKey([null, 'eu'], {
      headers: ['origin', 'destination', 'base_rate'],
      schema,
      dataRowIndex: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe('*|eu');
  });

  it('returns INVALID_SCHEMA for blank required keys with actionable message', () => {
    const requiredOnly: DiffSchema = {
      keyFields: ['origin', 'destination'],
      valueFields: ['base_rate'],
    };
    const result = buildKey([null, 'nyc'], {
      headers: ['origin', 'destination', 'base_rate'],
      schema: requiredOnly,
      dataRowIndex: 40,
      filename: 'rates.xlsx',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_SCHEMA');
    expect(result.error.message).toContain("row 42");
    expect(result.error.message).toContain("'origin'");
    expect(result.error.details).toMatchObject({
      rowNumber: 42,
      field: 'origin',
      filename: 'rates.xlsx',
    });
  });
});
