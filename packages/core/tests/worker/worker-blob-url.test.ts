import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorker, type WorkerClient } from '../../src/worker/create-worker.js';
import { WORKER_SOURCE } from '../../src/worker/worker-source.js';
import { loadFixture } from './helpers.js';

describe('worker Blob URL construction', () => {
  let client: WorkerClient | undefined;

  afterEach(() => {
    client?.terminate();
    client = undefined;
    vi.restoreAllMocks();
  });

  it('embeds a non-empty Worker source for Blob construction', () => {
    expect(WORKER_SOURCE.length).toBeGreaterThan(0);
  });

  it('constructs the Worker from a Blob URL and revokes it', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL');

    client = createWorker();

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURL.mock.calls[0]?.[0];
    expect(blobArg).toBeInstanceOf(Blob);
    if (blobArg instanceof Blob) {
      expect(blobArg.type).toBe('application/javascript');
    }

    const blobUrl = createObjectURL.mock.results[0]?.value as string;
    expect(blobUrl).toMatch(/^blob:/);
    expect(revokeObjectURL).toHaveBeenCalledWith(blobUrl);

    const bytes = await loadFixture('rate-card-v1.xlsx');
    const result = await client.parse(bytes, { filename: 'rate-card-v1.xlsx' });
    expect(result.ok).toBe(true);
  });
});
