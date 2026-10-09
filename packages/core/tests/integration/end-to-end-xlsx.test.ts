import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fixturePath } from '../fixtures/load-fixture.js';
import { diffFixtures, expectRateCardV1V2Diff } from './helpers.js';

describe('integration: parseFile → inferSchema → diffWorkbooks (xlsx)', () => {
  it('composes public APIs against rate-card fixtures', async () => {
    const a = new Uint8Array(readFileSync(fixturePath('rate-card-v1.xlsx')));
    const b = new Uint8Array(readFileSync(fixturePath('rate-card-v2.xlsx')));

    const result = await diffFixtures(a, b, 'rate-card-v1.xlsx', 'rate-card-v2.xlsx');
    expectRateCardV1V2Diff(result);
    expect(result.headers).toEqual(['origin', 'destination', 'base_rate', 'min_charge']);
  });
});
