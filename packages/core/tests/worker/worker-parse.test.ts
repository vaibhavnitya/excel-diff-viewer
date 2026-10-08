import { afterEach, describe, expect, it } from 'vitest';
import { parseFile } from '../../src/parsers/parse-file.js';
import { createWorker, type WorkerClient } from '../../src/worker/create-worker.js';
import { loadFixture } from './helpers.js';

describe('worker parse', () => {
  let client: WorkerClient | undefined;

  afterEach(() => {
    client?.terminate();
    client = undefined;
  });

  it('matches main-thread parseFile for an xlsx fixture', async () => {
    const bytes = await loadFixture('rate-card-v1.xlsx');
    const main = await parseFile(new Uint8Array(bytes.slice(0)), {
      filename: 'rate-card-v1.xlsx',
    });

    client = createWorker();
    const workerResult = await client.parse(bytes, { filename: 'rate-card-v1.xlsx' });

    expect(workerResult).toEqual(main);
    expect(workerResult.ok).toBe(true);
  });
});
