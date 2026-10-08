import { afterEach, describe, expect, it } from 'vitest';
import { createWorker, type WorkerClient } from '../../src/worker/create-worker.js';
import { loadFixture } from './helpers.js';

describe('worker terminate', () => {
  let client: WorkerClient | undefined;

  afterEach(() => {
    client?.terminate();
    client = undefined;
  });

  it('rejects in-flight parse with CANCELLED or WORKER_CRASHED when terminate() is called', async () => {
    const bytes = await loadFixture('rate-card-v1.xlsx');
    client = createWorker();
    const pending = client.parse(bytes, { filename: 'rate-card-v1.xlsx' });
    client.terminate();

    const result = await pending;
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(['CANCELLED', 'WORKER_CRASHED']).toContain(result.error.code);
  });
});
