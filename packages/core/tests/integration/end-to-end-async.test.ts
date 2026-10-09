import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { diffWorkbooks, diffWorkbooksAsync, type DiffControl } from '../../src/index.js';
import { fixturePath } from '../fixtures/load-fixture.js';
import {
  expectRateCardV1V2Diff,
  inferOk,
  parseOk,
} from './helpers.js';

describe('integration: parseFile → inferSchema → diffWorkbooksAsync', () => {
  it('matches sync diff and fires DiffControl progress', async () => {
    const bytesA = new Uint8Array(readFileSync(fixturePath('rate-card-v1.xlsx')));
    const bytesB = new Uint8Array(readFileSync(fixturePath('rate-card-v2.xlsx')));

    const a = await parseOk(bytesA, 'rate-card-v1.xlsx');
    const b = await parseOk(bytesB, 'rate-card-v2.xlsx');
    const schema = inferOk(a);

    const sync = diffWorkbooks(a, b, { schema });
    expect(sync.ok).toBe(true);
    if (!sync.ok) return;

    const progress: Array<[number, number]> = [];
    const control: DiffControl = {
      chunkSize: 2,
      isCancelled: () => false,
      onProgress: (processed, total) => {
        progress.push([processed, total]);
      },
      yieldBetweenChunks: async () => {
        /* no delay */
      },
    };

    const asyncResult = await diffWorkbooksAsync(a, b, { schema }, control);
    expect(asyncResult.ok).toBe(true);
    if (!asyncResult.ok) return;

    expect(asyncResult).toEqual(sync);
    expectRateCardV1V2Diff(asyncResult.value);
    expect(progress.length).toBeGreaterThanOrEqual(1);
    expect(progress[progress.length - 1]?.[0]).toBe(progress[progress.length - 1]?.[1]);
  });
});
