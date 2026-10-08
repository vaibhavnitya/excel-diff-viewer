import { describe, expect, it } from 'vitest';
import { diffWorkbooks } from '../../src/diff/diff-workbooks.js';
import { parseFile } from '../../src/parsers/parse-file.js';
import { inferSchema } from '../../src/schema/infer-schema.js';
import type { DiffSchema } from '../../src/types.js';
import { loadFixture } from '../fixtures/load-fixture.js';

const rateSchema: DiffSchema = {
  keyFields: ['origin', 'destination'],
  valueFields: ['base_rate', 'min_charge'],
  optionalKeyFields: ['origin'],
};

async function loadWorkbook(name: string) {
  const result = await parseFile(loadFixture(name), { filename: name });
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
}

describe('diffWorkbooks rate cards', () => {
  it('detects added, removed, modified, unchanged, and wildcard-origin bucket', async () => {
    const a = await loadWorkbook('rate-card-v1.xlsx');
    const b = await loadWorkbook('rate-card-v2.xlsx');

    const inferred = inferSchema(a.sheets[0]?.headers ?? []);
    expect(inferred.ok).toBe(true);

    const result = diffWorkbooks(a, b, { schema: rateSchema });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.stats).toEqual({
      added: 1,
      removed: 1,
      modified: 3,
      unchanged: 1,
    });

    const byKey = Object.fromEntries(result.value.rows.map((r) => [r.key, r]));

    expect(byKey['us|nyc']?.status).toBe('modified');
    expect(byKey['us|lax']?.status).toBe('modified');
    expect(byKey['*|eu']?.status).toBe('modified');
    expect(byKey['*|eu']?.changes.some((c) => c.field === 'base_rate')).toBe(true);
    expect(byKey['uk|lon']?.status).toBe('unchanged');
    expect(byKey['ca|tor']?.status).toBe('removed');
    expect(byKey['mx|mex']?.status).toBe('added');
  });

  it('surfaces DUPLICATE_KEYS as DiffError (not thrown)', async () => {
    const a = await loadWorkbook('edge-cases/duplicate-keys.xlsx');
    const b = await loadWorkbook('rate-card-v2.xlsx');
    const result = diffWorkbooks(a, b, { schema: rateSchema });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('DUPLICATE_KEYS');
    expect(result.error.message).toContain('duplicate key');
  });

  it('parses empty optional fields without throwing', async () => {
    const wb = await loadWorkbook('edge-cases/empty-fields.xlsx');
    expect(wb.sheets[0]?.rows.length).toBeGreaterThan(0);
    // blank destination is required → INVALID_SCHEMA when building keys
    const result = diffWorkbooks(wb, wb, { schema: rateSchema });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_SCHEMA');
    expect(result.error.details).toMatchObject({ field: 'destination' });
  });
});
