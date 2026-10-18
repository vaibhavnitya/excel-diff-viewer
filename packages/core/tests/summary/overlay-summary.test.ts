import { describe, expect, it } from 'vitest';
import { overlayWorkbooks } from '../../src/overlay/overlay.js';
import type { OverlaySchema } from '../../src/types.js';
import { wb, sheet } from '../overlay/helpers.js';

describe('OverlaySummary.targetColumns', () => {
  it('includes only derived rule targets, not pass-through', () => {
    const base = wb([
      sheet(
        'Sheet1',
        ['id', 'Base Rate'],
        [
          [1, 100],
          [2, 200],
        ],
      ),
    ]);
    const overlay = wb([
      sheet(
        'Sheet1',
        ['id', 'Fuel Pct'],
        [
          [1, 10],
          [2, 5],
        ],
      ),
    ]);
    const schema: OverlaySchema = {
      join: { base: ['id'], overlay: ['id'], wildcardOnEmpty: 'none' },
      compose: {
        kind: 'rules',
        rules: [
          {
            op: 'percentIncrease',
            base: 'Base Rate',
            overlay: 'Fuel Pct',
            target: 'Effective',
            defaultWhenMissing: 0,
          },
        ],
      },
    };
    const result = overlayWorkbooks(base, overlay, { schema });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.summary.targetColumns.map((c) => c.column)).toEqual([
      'Effective',
    ]);
    const effective = result.value.summary.targetColumns[0];
    expect(effective?.treatment).toBe('numeric');
    if (effective?.treatment !== 'numeric') return;
    expect(effective.count).toBe(2);
    expect(effective.mean).toBeCloseTo(160, 5); // 110 and 210
  });

  it('aggregates new keys introduced by fn compose', () => {
    const base = wb([sheet('Sheet1', ['id', 'rate'], [[1, 100], [2, 200]])]);
    const overlay = wb([sheet('Sheet1', ['id', 'fee'], [[1, 5], [2, 10]])]);
    const schema: OverlaySchema = {
      join: { base: ['id'], overlay: ['id'], wildcardOnEmpty: 'none' },
      compose: {
        kind: 'fn',
        fn: (baseRow, overlayRows) => {
          const fee = overlayRows[0]?.fee ?? 0;
          return {
            ...baseRow,
            total: (baseRow.rate as number) + (fee as number),
          };
        },
      },
    };
    const result = overlayWorkbooks(base, overlay, { schema });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.summary.targetColumns.map((c) => c.column)).toEqual([
      'total',
    ]);
    // Pass-through id/rate not re-aggregated
    expect(
      result.value.summary.targetColumns.some((c) => c.column === 'rate'),
    ).toBe(false);
  });

  it('does not count dropped fn rows in aggregates', () => {
    const base = wb([
      sheet('Sheet1', ['id', 'rate'], [
        [1, 100],
        [2, 200],
        [3, 300],
      ]),
    ]);
    const overlay = wb([sheet('Sheet1', ['id'], [[1], [2], [3]])]);
    const schema: OverlaySchema = {
      join: { base: ['id'], overlay: ['id'], wildcardOnEmpty: 'none' },
      compose: {
        kind: 'fn',
        fn: (baseRow) => {
          if (baseRow.id === 2) return null;
          return { ...baseRow, flag: true };
        },
      },
    };
    const result = overlayWorkbooks(base, overlay, { schema });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.summary.droppedByCompose).toBe(1);
    const flag = result.value.summary.targetColumns.find((c) => c.column === 'flag');
    expect(flag?.treatment).toBe('boolean');
    if (flag?.treatment !== 'boolean') return;
    expect(flag.trueCount).toBe(2);
    expect(flag.count).toBe(2);
  });

  it('identity fn yields empty targetColumns', () => {
    const base = wb([sheet('Sheet1', ['id'], [[1]])]);
    const overlay = wb([sheet('Sheet1', ['id'], [[1]])]);
    const schema: OverlaySchema = {
      join: { base: ['id'], overlay: ['id'], wildcardOnEmpty: 'none' },
      compose: { kind: 'fn', fn: (baseRow) => baseRow },
    };
    const result = overlayWorkbooks(base, overlay, { schema });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.summary.targetColumns).toEqual([]);
  });
});
