import { describe, expect, it } from 'vitest';
import {
  classifyCell,
  inferTreatment,
  isIsoDateString,
} from '../../src/summary/infer.js';

describe('isIsoDateString', () => {
  it('accepts date-only and datetime forms', () => {
    expect(isIsoDateString('2024-01-15')).toBe(true);
    expect(isIsoDateString('2024-01-15T10:30:00.000Z')).toBe(true);
    expect(isIsoDateString('2024-01-15T10:30:00Z')).toBe(true);
    expect(isIsoDateString('hello')).toBe(false);
    expect(isIsoDateString('10.5')).toBe(false);
  });
});

describe('classifyCell', () => {
  it('classifies primitives', () => {
    expect(classifyCell(null)).toBe('null');
    expect(classifyCell(1)).toBe('number');
    expect(classifyCell(true)).toBe('boolean');
    expect(classifyCell('2024-01-15')).toBe('isoDate');
    expect(classifyCell('air')).toBe('string');
  });
});

describe('inferTreatment', () => {
  it('infers each treatment in isolation', () => {
    expect(inferTreatment([1, 2, null])).toEqual({
      kind: 'treatment',
      treatment: 'numeric',
      fellBack: false,
    });
    expect(inferTreatment(['a', 'b'])).toEqual({
      kind: 'treatment',
      treatment: 'categorical',
      fellBack: false,
    });
    expect(inferTreatment(['2024-01-01', '2024-02-01'])).toEqual({
      kind: 'treatment',
      treatment: 'date',
      fellBack: false,
    });
    expect(inferTreatment([true, false, null])).toEqual({
      kind: 'treatment',
      treatment: 'boolean',
      fellBack: false,
    });
  });

  it('returns all-null when every cell is null', () => {
    expect(inferTreatment([null, null])).toEqual({ kind: 'all-null' });
  });

  it('falls back to categorical on mixed types', () => {
    expect(inferTreatment([1, 'x'])).toEqual({
      kind: 'treatment',
      treatment: 'categorical',
      fellBack: true,
    });
  });
});
