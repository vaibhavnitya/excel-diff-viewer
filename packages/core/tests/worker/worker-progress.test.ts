import { afterEach, describe, expect, it } from 'vitest';
import { createWorker, type WorkerClient, type WorkerProgress } from '../../src/worker/create-worker.js';
import { syntheticSchema, syntheticWorkbook } from './helpers.js';

describe('worker progress', () => {
  let client: WorkerClient | undefined;

  afterEach(() => {
    client?.terminate();
    client = undefined;
  });

  it('fires at least 3 monotonically increasing progress callbacks for 20k rows', async () => {
    const a = syntheticWorkbook(20_000, 'a.csv');
    const b = syntheticWorkbook(20_000, 'b.csv');
    const events: WorkerProgress[] = [];

    client = createWorker();
    const unsubscribe = client.onProgress((p) => {
      events.push(p);
    });

    const result = await client.diff(a, b, syntheticSchema);
    unsubscribe();

    expect(result.ok).toBe(true);
    expect(events.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < events.length; i += 1) {
      expect(events[i]!.pct).toBeGreaterThanOrEqual(events[i - 1]!.pct);
    }
    expect(events[events.length - 1]!.pct).toBe(100);
  });
});
