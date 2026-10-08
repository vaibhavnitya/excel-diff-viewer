import { afterEach, describe, expect, it } from 'vitest';
import { diffWorkbooks } from '../../src/diff/diff-workbooks.js';
import { parseFile } from '../../src/parsers/parse-file.js';
import { createWorker, type WorkerClient } from '../../src/worker/create-worker.js';
import { loadFixture, rateSchema } from './helpers.js';

describe('worker diff', () => {
  let client: WorkerClient | undefined;

  afterEach(() => {
    client?.terminate();
    client = undefined;
  });

  it('matches main-thread diffWorkbooks for rate-card-v1 vs rate-card-v2', async () => {
    const bytesA = await loadFixture('rate-card-v1.xlsx');
    const bytesB = await loadFixture('rate-card-v2.xlsx');
    const a = await parseFile(new Uint8Array(bytesA.slice(0)), { filename: 'rate-card-v1.xlsx' });
    const b = await parseFile(new Uint8Array(bytesB.slice(0)), { filename: 'rate-card-v2.xlsx' });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;

    const main = diffWorkbooks(a.value, b.value, { schema: rateSchema });

    client = createWorker();
    const workerResult = await client.diff(a.value, b.value, rateSchema);

    expect(workerResult).toEqual(main);
    expect(workerResult.ok).toBe(true);
  });
});
