import { describe, expect, it } from 'vitest';
import {
  applyRulesToRow,
  buildRulesComposeContext,
} from '../../src/overlay/compose-rules.js';
import type { ResolvedRule } from '../../src/overlay/validate.js';
import type { RowWarning } from '../../src/types.js';

describe('compose-rules', () => {
  const passthroughHeaders = ['Lane', 'Vehicle Type', 'Base Rate'];
  const passthroughIndexes = [0, 1, 2];

  it('applies add', () => {
    const resolved: ResolvedRule[] = [
      { op: 'add', baseIndex: 2, overlayIndex: 1, target: 'Total' },
    ];
    const ctx = buildRulesComposeContext(passthroughHeaders, passthroughIndexes, resolved);
    const warnings: RowWarning[] = [];
    const out = applyRulesToRow(['L1', 'Van', 100], ['Van', 10], 0, ctx, warnings);
    expect(out).toEqual(['L1', 'Van', 100, 110]);
  });

  it('applies percentIncrease (5 means +5%)', () => {
    const resolved: ResolvedRule[] = [
      { op: 'percentIncrease', baseIndex: 2, overlayIndex: 1, target: 'Effective' },
    ];
    const ctx = buildRulesComposeContext(passthroughHeaders, passthroughIndexes, resolved);
    const out = applyRulesToRow(['L1', 'Van', 100], ['Van', 5], 0, ctx, []);
    expect(out[3]).toBe(105);
  });

  it('applies multiply', () => {
    const resolved: ResolvedRule[] = [
      { op: 'multiply', baseIndex: 2, overlayIndex: 1, target: 'Scaled' },
    ];
    const ctx = buildRulesComposeContext(passthroughHeaders, passthroughIndexes, resolved);
    const out = applyRulesToRow(['L1', 'Van', 100], ['Van', 1.05], 0, ctx, []);
    expect(out[3]).toBeCloseTo(105);
  });

  it('applies replace', () => {
    const resolved: ResolvedRule[] = [
      { op: 'replace', overlayIndex: 1, target: 'Fuel' },
    ];
    const ctx = buildRulesComposeContext(passthroughHeaders, passthroughIndexes, resolved);
    const out = applyRulesToRow(['L1', 'Van', 100], ['Van', 7], 0, ctx, []);
    expect(out[3]).toBe(7);
  });

  it('applies passthrough from overlay', () => {
    const resolved: ResolvedRule[] = [
      { op: 'passthrough', from: 'overlay', sourceIndex: 1, target: 'Fuel Pct' },
    ];
    const ctx = buildRulesComposeContext(passthroughHeaders, passthroughIndexes, resolved);
    const out = applyRulesToRow(['L1', 'Van', 100], ['Van', 9], 0, ctx, []);
    expect(out[3]).toBe(9);
  });

  it('uses defaultWhenMissing when overlay absent', () => {
    const resolved: ResolvedRule[] = [
      {
        op: 'percentIncrease',
        baseIndex: 2,
        overlayIndex: 1,
        target: 'Effective',
        defaultWhenMissing: 0,
      },
    ];
    const ctx = buildRulesComposeContext(passthroughHeaders, passthroughIndexes, resolved);
    const out = applyRulesToRow(['L1', 'Bike', 40], null, 0, ctx, []);
    expect(out[3]).toBe(40);
  });

  it('nulls target when overlay missing and no default', () => {
    const resolved: ResolvedRule[] = [
      { op: 'add', baseIndex: 2, overlayIndex: 1, target: 'Total' },
    ];
    const ctx = buildRulesComposeContext(passthroughHeaders, passthroughIndexes, resolved);
    const out = applyRulesToRow(['L1', 'Bike', 40], null, 0, ctx, []);
    expect(out[3]).toBeNull();
  });

  it('collects warning for non-numeric base', () => {
    const resolved: ResolvedRule[] = [
      { op: 'add', baseIndex: 2, overlayIndex: 1, target: 'Total' },
    ];
    const ctx = buildRulesComposeContext(passthroughHeaders, passthroughIndexes, resolved);
    const warnings: RowWarning[] = [];
    const out = applyRulesToRow(['L1', 'Van', 'abc'], ['Van', 10], 0, ctx, warnings);
    expect(out[3]).toBeNull();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.target).toBe('Total');
  });

  it('rule target overwrites a passthrough column', () => {
    const resolved: ResolvedRule[] = [
      { op: 'replace', overlayIndex: 1, target: 'Base Rate' },
    ];
    const ctx = buildRulesComposeContext(passthroughHeaders, passthroughIndexes, resolved);
    expect(ctx.outputHeaders).toEqual(passthroughHeaders);
    const out = applyRulesToRow(['L1', 'Van', 100], ['Van', 999], 0, ctx, []);
    expect(out[2]).toBe(999);
  });

  it('passthrough from overlay is null when overlay row is missing', () => {
    const resolved: ResolvedRule[] = [
      { op: 'passthrough', from: 'overlay', sourceIndex: 1, target: 'Fuel Pct' },
    ];
    const ctx = buildRulesComposeContext(passthroughHeaders, passthroughIndexes, resolved);
    const out = applyRulesToRow(['L1', 'Van', 100], null, 0, ctx, []);
    expect(out[3]).toBeNull();
  });

  it('passthrough from base copies the source cell', () => {
    const resolved: ResolvedRule[] = [
      { op: 'passthrough', from: 'base', sourceIndex: 0, target: 'LaneCopy' },
    ];
    const ctx = buildRulesComposeContext(passthroughHeaders, passthroughIndexes, resolved);
    const out = applyRulesToRow(['L1', 'Van', 100], null, 0, ctx, []);
    expect(out[3]).toBe('L1');
  });

  it('passthrough coalesces missing dense cells to null', () => {
    const resolved: ResolvedRule[] = [
      { op: 'passthrough', from: 'base', sourceIndex: 5, target: 'Missing' },
      {
        op: 'passthrough',
        from: 'overlay',
        sourceIndex: 5,
        target: 'MissingOv',
      },
    ];
    const ctx = buildRulesComposeContext(passthroughHeaders, passthroughIndexes, resolved);
    const out = applyRulesToRow(['L1'], ['Van'], 0, ctx, []);
    expect(out[3]).toBeNull();
    expect(out[4]).toBeNull();
  });

  it('nulls target when base cell is blank (null) with no warning', () => {
    const resolved: ResolvedRule[] = [
      { op: 'add', baseIndex: 2, overlayIndex: 1, target: 'Total' },
    ];
    const ctx = buildRulesComposeContext(passthroughHeaders, passthroughIndexes, resolved);
    const warnings: RowWarning[] = [];
    const out = applyRulesToRow(['L1', 'Van', null], ['Van', 10], 0, ctx, warnings);
    expect(out[3]).toBeNull();
    expect(warnings).toHaveLength(0);
  });

  it('uses defaultWhenMissing of 0 when overlay cell is empty string', () => {
    const resolved: ResolvedRule[] = [
      {
        op: 'add',
        baseIndex: 2,
        overlayIndex: 1,
        target: 'Total',
        defaultWhenMissing: 0,
      },
    ];
    const ctx = buildRulesComposeContext(passthroughHeaders, passthroughIndexes, resolved);
    const out = applyRulesToRow(['L1', 'Van', 100], ['Van', ''], 0, ctx, []);
    expect(out[3]).toBe(100);
  });

  it('uses negative defaultWhenMissing', () => {
    const resolved: ResolvedRule[] = [
      {
        op: 'add',
        baseIndex: 2,
        overlayIndex: 1,
        target: 'Total',
        defaultWhenMissing: -5,
      },
    ];
    const ctx = buildRulesComposeContext(passthroughHeaders, passthroughIndexes, resolved);
    const out = applyRulesToRow(['L1', 'Van', 100], null, 0, ctx, []);
    expect(out[3]).toBe(95);
  });

  it('replace nulls target when overlay cell is empty', () => {
    const resolved: ResolvedRule[] = [
      { op: 'replace', overlayIndex: 1, target: 'Fuel' },
    ];
    const ctx = buildRulesComposeContext(passthroughHeaders, passthroughIndexes, resolved);
    const out = applyRulesToRow(['L1', 'Van', 100], ['Van', null], 0, ctx, []);
    expect(out[3]).toBeNull();
  });

  it('caps row warnings at 100', () => {
    const resolved: ResolvedRule[] = [
      { op: 'add', baseIndex: 2, overlayIndex: 1, target: 'Total' },
    ];
    const ctx = buildRulesComposeContext(passthroughHeaders, passthroughIndexes, resolved);
    const warnings: RowWarning[] = [];
    for (let i = 0; i < 105; i += 1) {
      applyRulesToRow(['L1', 'Van', 'x'], ['Van', 1], i, ctx, warnings);
    }
    expect(warnings).toHaveLength(100);
  });
});
