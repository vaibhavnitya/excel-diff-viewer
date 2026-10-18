import { describe, expect, it } from 'vitest';
import {
  createBooleanAccumulator,
  createCategoricalAccumulator,
  createDateAccumulator,
  createNumericAccumulator,
  finalizeBoolean,
  finalizeCategorical,
  finalizeDate,
  finalizeNumeric,
  observeBoolean,
  observeCategorical,
  observeDate,
  observeNumeric,
} from '../../src/summary/stats.js';
import type { SummaryWarning } from '../../src/types.js';

describe('numeric stats', () => {
  it('computes min/max/mean/median/sum/distinct for odd count', () => {
    const acc = createNumericAccumulator();
    for (const v of [3, 1, 2]) {
      observeNumeric(acc, v);
    }
    observeNumeric(acc, null);
    const warnings: SummaryWarning[] = [];
    const s = finalizeNumeric('n', acc, warnings);
    expect(s).toMatchObject({
      treatment: 'numeric',
      count: 3,
      nullCount: 1,
      min: 1,
      max: 3,
      mean: 2,
      median: 2,
      sum: 6,
      distinctCount: 3,
    });
    expect(s.stddev).toBeCloseTo(1, 5);
    expect(warnings).toHaveLength(0);
  });

  it('averages two middles for even median', () => {
    const acc = createNumericAccumulator();
    for (const v of [1, 2, 3, 4]) {
      observeNumeric(acc, v);
    }
    const s = finalizeNumeric('n', acc, []);
    expect(s.median).toBe(2.5);
  });

  it('returns null stats when count === 0', () => {
    const acc = createNumericAccumulator();
    observeNumeric(acc, null);
    observeNumeric(acc, null);
    const s = finalizeNumeric('n', acc, []);
    expect(s).toMatchObject({
      count: 0,
      nullCount: 2,
      min: null,
      max: null,
      mean: null,
      median: null,
      stddev: null,
      sum: 0,
      distinctCount: 0,
    });
  });

  it('emits STDDEV_UNDEFINED when count < 2', () => {
    const acc = createNumericAccumulator();
    observeNumeric(acc, 42);
    const warnings: SummaryWarning[] = [];
    const s = finalizeNumeric('n', acc, warnings);
    expect(s.stddev).toBeNull();
    expect(warnings).toEqual([
      expect.objectContaining({ code: 'STDDEV_UNDEFINED', column: 'n' }),
    ]);
  });

  it('emits MIXED_TYPES for non-numeric under numeric treatment', () => {
    const acc = createNumericAccumulator();
    observeNumeric(acc, 1);
    observeNumeric(acc, 'x');
    const warnings: SummaryWarning[] = [];
    finalizeNumeric('n', acc, warnings);
    expect(warnings.some((w) => w.code === 'MIXED_TYPES')).toBe(true);
  });
});

describe('categorical stats', () => {
  it('counts blanks separately from nulls and truncates topN', () => {
    const acc = createCategoricalAccumulator();
    observeCategorical(acc, null);
    observeCategorical(acc, '');
    observeCategorical(acc, 'a');
    observeCategorical(acc, 'a');
    observeCategorical(acc, 'b');
    const warnings: SummaryWarning[] = [];
    const s = finalizeCategorical('c', acc, 1, warnings);
    expect(s.nullCount).toBe(1);
    expect(s.blankCount).toBe(1);
    expect(s.distinctCount).toBe(3); // '', 'a', 'b'
    expect(s.topValues).toEqual([{ value: 'a', count: 2 }]);
    expect(warnings.some((w) => w.code === 'TOP_N_TRUNCATED')).toBe(true);
  });

  it('returns all values when topN >= distinct', () => {
    const acc = createCategoricalAccumulator();
    observeCategorical(acc, 'a');
    observeCategorical(acc, 'b');
    const warnings: SummaryWarning[] = [];
    const s = finalizeCategorical('c', acc, 10, warnings);
    expect(s.topValues).toHaveLength(2);
    expect(warnings).toHaveLength(0);
  });
});

describe('date stats', () => {
  it('uses ISO string comparison for min/max', () => {
    const acc = createDateAccumulator();
    observeDate(acc, '2024-01-15');
    observeDate(acc, '2024-01-15T10:30:00.000Z');
    observeDate(acc, '2023-12-01');
    observeDate(acc, null);
    const s = finalizeDate('d', acc, []);
    expect(s.min).toBe('2023-12-01');
    expect(s.max).toBe('2024-01-15T10:30:00.000Z');
    expect(s.distinctCount).toBe(3);
    expect(s.nullCount).toBe(1);
  });
});

describe('boolean stats', () => {
  it('counts true and false', () => {
    const acc = createBooleanAccumulator();
    observeBoolean(acc, true);
    observeBoolean(acc, true);
    observeBoolean(acc, false);
    observeBoolean(acc, null);
    const s = finalizeBoolean('b', acc, []);
    expect(s).toMatchObject({
      trueCount: 2,
      falseCount: 1,
      count: 3,
      nullCount: 1,
    });
  });
});
