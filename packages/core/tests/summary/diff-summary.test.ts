import { describe, expect, it } from 'vitest';
import { diffWorkbooks } from '../../src/diff/diff-workbooks.js';
import type { DiffSchema, Workbook } from '../../src/types.js';

function wb(
  headers: readonly string[],
  rows: readonly (readonly (string | number | null)[])[],
): Workbook {
  return {
    sheets: [{ name: 'Sheet1', headers, rows }],
    activeSheetIndex: 0,
    meta: { format: 'csv', filename: 't.csv' },
  };
}

const schema: DiffSchema = {
  keyFields: ['id'],
  valueFields: ['rate', 'mode'],
};

describe('DiffSummary.fieldChanges', () => {
  it('aggregates numeric field changes', () => {
    const a = wb(
      ['id', 'rate', 'mode'],
      [
        ['1', 100, 'air'],
        ['2', 200, 'air'],
      ],
    );
    const b = wb(
      ['id', 'rate', 'mode'],
      [
        ['1', 110, 'air'],
        ['2', 180, 'air'],
      ],
    );
    const result = diffWorkbooks(a, b, { schema });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.summary).toMatchObject({
      totalKeys: 2,
      modified: 2,
      added: 0,
      removed: 0,
    });
    expect(result.value.stats.modified).toBe(result.value.summary.modified);

    const rate = result.value.summary.fieldChanges.find((f) => f.field === 'rate');
    expect(rate).toMatchObject({
      changedRows: 2,
      categoricalChanges: null,
    });
    expect(rate?.numericChanges).toMatchObject({
      meanDelta: -5,
      meanAbsDelta: 15,
      maxAbsDelta: 20,
      increased: 1,
      decreased: 1,
    });
  });

  it('aggregates categorical transitions capped at 10', () => {
    const rowsA = Array.from({ length: 12 }, (_, i) => [
      String(i),
      1,
      `from${i}`,
    ] as const);
    const rowsB = Array.from({ length: 12 }, (_, i) => [
      String(i),
      1,
      `to${i}`,
    ] as const);
    const result = diffWorkbooks(wb(['id', 'rate', 'mode'], rowsA), wb(['id', 'rate', 'mode'], rowsB), {
      schema,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const mode = result.value.summary.fieldChanges.find((f) => f.field === 'mode');
    expect(mode?.numericChanges).toBeNull();
    expect(mode?.categoricalChanges?.topTransitions).toHaveLength(10);
    expect(mode?.changedRows).toBe(12);
  });

  it('classifies mixed-type field changes by majority with warning', () => {
    const a = wb(
      ['id', 'rate', 'mode'],
      [
        ['1', 100, 'x'],
        ['2', 100, 'x'],
        ['3', 'old', 'x'],
      ],
    );
    const b = wb(
      ['id', 'rate', 'mode'],
      [
        ['1', 110, 'x'],
        ['2', 120, 'x'],
        ['3', 'new', 'x'],
      ],
    );
    const rateOnly: DiffSchema = { keyFields: ['id'], valueFields: ['rate'] };
    const result = diffWorkbooks(a, b, { schema: rateOnly });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rate = result.value.summary.fieldChanges[0];
    expect(rate?.changedRows).toBe(3);
    // 2 numeric vs 1 categorical → numeric majority
    expect(rate?.numericChanges).not.toBeNull();
    expect(rate?.categoricalChanges).toBeNull();
    expect(
      result.value.summary.warnings.some((w) => w.code === 'MIXED_TYPES'),
    ).toBe(true);
  });

  it('returns null aggregates for fields with zero changes', () => {
    const a = wb(['id', 'rate', 'mode'], [['1', 100, 'air']]);
    const b = wb(['id', 'rate', 'mode'], [['1', 100, 'air']]);
    const result = diffWorkbooks(a, b, { schema });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const field of result.value.summary.fieldChanges) {
      expect(field.changedRows).toBe(0);
      expect(field.numericChanges).toBeNull();
      expect(field.categoricalChanges).toBeNull();
    }
  });
});
