import { afterEach, describe, expect, it } from 'vitest';
import { createWorker, inferSchema, type WorkerClient } from '../../src/index.js';
import { loadFixture } from '../worker/helpers.js';
import { expectRateCardV1V2Diff } from './helpers.js';

describe('integration: WorkerClient parse → inferSchema → WorkerClient.diff', () => {
  let client: WorkerClient | undefined;

  afterEach(() => {
    client?.terminate();
    client = undefined;
  });

  it('composes public Worker APIs against rate-card fixtures', async () => {
    // Separate fetches: parse transfers ArrayBuffer ownership into the Worker.
    const bytesA = await loadFixture('rate-card-v1.xlsx');
    const bytesB = await loadFixture('rate-card-v2.xlsx');

    client = createWorker();

    const parsedA = await client.parse(bytesA, { filename: 'rate-card-v1.xlsx' });
    const parsedB = await client.parse(bytesB, { filename: 'rate-card-v2.xlsx' });
    expect(parsedA.ok && parsedB.ok).toBe(true);
    if (!parsedA.ok || !parsedB.ok) return;

    const inferred = inferSchema(parsedA.value.sheets[0]?.headers ?? []);
    expect(inferred.ok).toBe(true);
    if (!inferred.ok) return;

    const diffed = await client.diff(parsedA.value, parsedB.value, inferred.value);
    expect(diffed.ok).toBe(true);
    if (!diffed.ok) return;

    expectRateCardV1V2Diff(diffed.value);
  });
});
