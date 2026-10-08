import { afterEach, describe, expect, it } from 'vitest';
import { createWorker, type WorkerClient } from '../../src/worker/create-worker.js';
import { syntheticSchema, syntheticWorkbook } from './helpers.js';

describe('worker cancel', () => {
  let client: WorkerClient | undefined;

  afterEach(() => {
    client?.terminate();
    client = undefined;
  });

  it('returns CANCELLED when cancel() is called during a large diff', async () => {
    const a = syntheticWorkbook(50_000, 'a.csv');
    const b = syntheticWorkbook(50_000, 'b.csv');
    // Mutate side B so the walk is non-trivial.
    const bRows = b.sheets[0]!.rows.map((row, i) => (i % 7 === 0 ? [row[0]!, Number(row[1]) + 1] : row));
    const bMutated = {
      ...b,
      sheets: [{ ...b.sheets[0]!, rows: bRows }],
    };

    client = createWorker();
    const pending = client.diff(a, bMutated, syntheticSchema);
    await new Promise((r) => setTimeout(r, 100));
    client.cancel();

    const result = await pending;
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CANCELLED');
  });
});
