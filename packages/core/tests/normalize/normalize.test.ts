import { describe, expect, it } from 'vitest';
import { normalizeCell } from '../../src/normalize/normalize-cell.js';
import { normalizeDate, dateToIsoString } from '../../src/normalize/normalize-date.js';
import { isBlank, normalizeEmpty } from '../../src/normalize/normalize-empty.js';
import { normalizeNumber } from '../../src/normalize/normalize-number.js';
import { normalizeString } from '../../src/normalize/normalize-string.js';
import { resolveNumericTolerance } from '../../src/defaults.js';
import { numbersEqual, valuesEqual } from '../../src/diff/compare-values.js';

describe('normalizeEmpty / isBlank', () => {
  it('treats null and whitespace as blank', () => {
    expect(isBlank(null)).toBe(true);
    expect(isBlank('  ')).toBe(true);
    expect(isBlank('x')).toBe(false);
    expect(normalizeEmpty('')).toBeNull();
  });
});

describe('normalizeString', () => {
  it('trims and lowercases', () => {
    expect(normalizeString('  US ')).toBe('us');
  });
});

describe('normalizeNumber', () => {
  it('parses plain decimals', () => {
    expect(normalizeNumber('10.00')).toBe(10);
    expect(normalizeNumber('1e2')).toBe(100);
  });

  it('leaves non-numeric strings alone', () => {
    expect(normalizeNumber('12A')).toBe('12A');
  });
});

describe('normalizeDate', () => {
  it('keeps ISO date-only strings', () => {
    expect(normalizeDate('2024-01-15')).toBe('2024-01-15');
  });

  it('canonicalizes Date via dateToIsoString', () => {
    const d = new Date(Date.UTC(2024, 0, 15, 10, 30, 0));
    expect(dateToIsoString(d)).toBe('2024-01-15T10:30:00.000Z');
    const dateOnly = new Date(Date.UTC(2024, 0, 15, 0, 0, 0));
    expect(dateToIsoString(dateOnly)).toBe('2024-01-15');
  });
});

describe('normalizeCell pipeline', () => {
  it('lowercases strings and coerces numbers', () => {
    expect(normalizeCell('  NYC ')).toBe('nyc');
    expect(normalizeCell('10.5')).toBe(10.5);
  });
});

describe('numeric tolerance', () => {
  const def = resolveNumericTolerance();

  it('treats 10 and 10.0000001 as equal within defaults', () => {
    expect(numbersEqual(10, 10.0000001, def)).toBe(true);
    expect(valuesEqual(10, 10.0000001, def)).toBe(true);
  });

  it('treats 10 and 10.01 as not equal', () => {
    expect(numbersEqual(10, 10.01, def)).toBe(false);
  });

  it('number shorthand sets absolute only', () => {
    const t = resolveNumericTolerance(0.05);
    expect(t.absolute).toBe(0.05);
    expect(t.relative).toBe(1e-9);
    expect(numbersEqual(10, 10.04, t)).toBe(true);
  });

  it('relative tolerance covers large magnitudes', () => {
    const t = resolveNumericTolerance({ absolute: 1e-6, relative: 1e-6 });
    expect(numbersEqual(1_000_000, 1_000_000.5, t)).toBe(true);
  });
});
