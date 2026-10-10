import { describe, expect, it } from 'vitest';
import {
  agFilterForColumnType,
  collectColumnValues,
  detectColumnType,
} from '../src/detect-column-type.js';

describe('detectColumnType', () => {
  it('detects numeric columns', () => {
    expect(detectColumnType([1, 2.5, 3, null, 4])).toBe('number');
    expect(agFilterForColumnType('number')).toBe('agNumberColumnFilter');
  });

  it('detects ISO date columns', () => {
    expect(
      detectColumnType([
        '2024-01-15',
        '2024-01-16T10:30:00.000Z',
        null,
        '2023-12-01',
      ]),
    ).toBe('date');
    expect(agFilterForColumnType('date')).toBe('agDateColumnFilter');
  });

  it('returns text for mixed columns', () => {
    expect(detectColumnType([1, 'US', 3])).toBe('text');
    expect(detectColumnType(['hello', 'world'])).toBe('text');
    expect(detectColumnType([true, false])).toBe('text');
    expect(agFilterForColumnType('text')).toBe('agTextColumnFilter');
  });

  it('returns text for empty / all-null columns', () => {
    expect(detectColumnType([])).toBe('text');
    expect(detectColumnType([null, null])).toBe('text');
  });

  it('collectColumnValues samples non-null cells', () => {
    const rows = [
      [1, 'a'],
      [null, 'b'],
      [3, 'c'],
    ] as const;
    expect(collectColumnValues(rows, 0)).toEqual([1, 3]);
  });
});
