import { expect } from 'vitest';
import {
  diffWorkbooks,
  inferSchema,
  parseFile,
  type DiffResult,
  type DiffSchema,
  type Workbook,
} from '../../src/index.js';

/** Assert the rate-card-v1 → v2 composition result (fixture design). */
export function expectRateCardV1V2Diff(result: DiffResult): void {
  expect(result.stats).toEqual({
    added: 1,
    removed: 1,
    modified: 3, // 2 specific + 1 wildcard-origin `*|eu`
    unchanged: 1,
  });

  const byKey = Object.fromEntries(result.rows.map((r) => [r.key, r]));
  expect(byKey['us|nyc']?.status).toBe('modified');
  expect(byKey['us|lax']?.status).toBe('modified');
  expect(byKey['*|eu']?.status).toBe('modified');
  expect(byKey['*|eu']?.changes.some((c) => c.field === 'base_rate')).toBe(true);
  expect(byKey['uk|lon']?.status).toBe('unchanged');
  expect(byKey['ca|tor']?.status).toBe('removed');
  expect(byKey['mx|mex']?.status).toBe('added');
}

export async function parseOk(
  input: ArrayBuffer | Uint8Array,
  filename: string,
): Promise<Workbook> {
  const parsed = await parseFile(input, { filename });
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) {
    throw new Error(parsed.error.message);
  }
  return parsed.value;
}

export function inferOk(workbook: Workbook): DiffSchema {
  const headers = workbook.sheets[workbook.activeSheetIndex]?.headers ?? [];
  const inferred = inferSchema(headers);
  expect(inferred.ok).toBe(true);
  if (!inferred.ok) {
    throw new Error(inferred.error.message);
  }
  return inferred.value;
}

/** Public-API chain: parse → inferSchema → diffWorkbooks. */
export async function diffFixtures(
  bytesA: ArrayBuffer | Uint8Array,
  bytesB: ArrayBuffer | Uint8Array,
  filenameA: string,
  filenameB: string,
): Promise<DiffResult> {
  const a = await parseOk(bytesA, filenameA);
  const b = await parseOk(bytesB, filenameB);
  const schema = inferOk(a);
  const diffed = diffWorkbooks(a, b, { schema });
  expect(diffed.ok).toBe(true);
  if (!diffed.ok) {
    throw new Error(diffed.error.message);
  }
  return diffed.value;
}
