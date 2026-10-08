import { describe, expect, it } from 'vitest';
import {
  canonicalizeParsedDate,
  excelSerialToDate,
  normalizeDate,
} from '../../src/normalize/normalize-date.js';
import { normalizeCell } from '../../src/normalize/normalize-cell.js';
import { normalizeNumber } from '../../src/normalize/normalize-number.js';
import { normalizeRow } from '../../src/normalize/normalize-row.js';

describe('normalizeDate edge cases', () => {
  it('converts excel serial numbers in range', () => {
    const iso = normalizeDate(44927); // ~2023-01-01-ish
    expect(typeof iso).toBe('string');
    expect(String(iso)).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it('leaves ordinary numbers alone', () => {
    expect(normalizeDate(10.5)).toBe(10.5);
  });

  it('normalizes slash dates and offset datetimes', () => {
    expect(normalizeDate('2024/01/15')).toBe('2024-01-15');
    expect(normalizeDate('2024-01-15T10:30:00Z')).toBe('2024-01-15T10:30:00.000Z');
    const withOffset = normalizeDate('2024-01-15T10:30:00+00:00');
    expect(withOffset).toBe('2024-01-15T10:30:00.000Z');
  });

  it('canonicalizeParsedDate handles Date and serial', () => {
    expect(canonicalizeParsedDate(new Date(Date.UTC(2024, 0, 15)))).toBe('2024-01-15');
    expect(typeof canonicalizeParsedDate(44927)).toBe('string');
    expect(excelSerialToDate(44927)).toBeInstanceOf(Date);
  });

  it('returns null for blank and non-dates', () => {
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate(true)).toBe(true);
    expect(normalizeDate('not-a-date')).toBe('not-a-date');
  });
});

describe('normalizeNumber / cell / row edges', () => {
  it('handles empty, non-finite, and boolean', () => {
    expect(normalizeNumber('   ')).toBeNull();
    expect(normalizeNumber(Number.NaN)).toBeNull();
    expect(normalizeNumber(Number.POSITIVE_INFINITY)).toBeNull();
    expect(normalizeNumber(true)).toBe(true);
    expect(normalizeNumber('.5')).toBe(0.5);
  });

  it('normalizeRow uses empty header fallback', () => {
    const row = normalizeRow(['x'], ['']);
    expect(row[0]).toBe('x');
  });

  it('uses custom normalizer when provided', () => {
    expect(normalizeCell('x', () => 'custom')).toBe('custom');
  });

  it('normalizeRow pads missing cells and applies per-header normalizers', () => {
    const row = normalizeRow([' A '], ['origin', 'destination'], {
      origin: (v) => (typeof v === 'string' ? v.trim().toUpperCase() : v),
    });
    expect(row).toEqual(['A', null]);
  });
});
