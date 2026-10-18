import { describe, expect, it } from 'vitest';
import {
  buildOverlayJoinIndex,
  lookupOverlayMatches,
} from '../../src/overlay/join.js';
import { sheet } from './helpers.js';

describe('overlay join index', () => {
  const overlaySheet = sheet(
    'O',
    ['Vehicle Type', 'Region', 'Fuel Pct'],
    [
      ['Van', 'North', 5],
      ['Truck', 'South', 8],
      [null, 'North', 3], // wildcard Vehicle Type when mode=overlay
      ['Bike', null, 2], // wildcard Region
    ],
  );

  it('exact lookup with wildcardOnEmpty none', () => {
    const index = buildOverlayJoinIndex(overlaySheet, [0, 1], 'none');
    const base = sheet('B', ['Vehicle Type', 'Region'], [['Van', 'North']]);
    const hits = lookupOverlayMatches(index, base.rows[0]!, [0, 1]);
    expect(hits).toEqual([0]);
  });

  it('wildcardOnEmpty overlay matches empty overlay cells to any base value', () => {
    const index = buildOverlayJoinIndex(overlaySheet, [0, 1], 'overlay');
    // Base Van/North matches: exact Van/North + wildcard-VT/North
    const hits = lookupOverlayMatches(index, ['Van', 'North'], [0, 1]);
    expect(hits.sort()).toEqual([0, 2]);
  });

  it('wildcard off does not match empty overlay to filled base', () => {
    const index = buildOverlayJoinIndex(overlaySheet, [0, 1], 'none');
    const hits = lookupOverlayMatches(index, ['Van', 'North'], [0, 1]);
    expect(hits).toEqual([0]);
  });

  it('normalizes join values (trim + lowercase)', () => {
    const indexed = sheet('O', ['VT'], [['  VAN  ']]);
    const index = buildOverlayJoinIndex(indexed, [0], 'none');
    const hits = lookupOverlayMatches(index, ['van'], [0]);
    expect(hits).toEqual([0]);
  });

  it('indexes multiple overlay rows under the same key', () => {
    const dup = sheet('O', ['Vehicle Type', 'Fuel Pct'], [
      ['Van', 5],
      ['Van', 6],
    ]);
    const index = buildOverlayJoinIndex(dup, [0], 'none');
    const hits = lookupOverlayMatches(index, ['Van'], [0]);
    expect(hits).toEqual([0, 1]);
  });

  it('all-empty overlay join row matches any base under wildcard mode', () => {
    const indexed = sheet('O', ['A', 'B', 'Pct'], [[null, null, 9]]);
    const index = buildOverlayJoinIndex(indexed, [0, 1], 'overlay');
    const hits = lookupOverlayMatches(index, ['X', 'Y'], [0, 1]);
    expect(hits).toEqual([0]);
  });

  it('all-empty overlay join row does not match filled base when wildcards off', () => {
    const indexed = sheet('O', ['A', 'B', 'Pct'], [[null, null, 9]]);
    const index = buildOverlayJoinIndex(indexed, [0, 1], 'none');
    const hits = lookupOverlayMatches(index, ['X', 'Y'], [0, 1]);
    expect(hits).toEqual([]);
  });
});
