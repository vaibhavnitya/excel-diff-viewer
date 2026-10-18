import { describe, expect, it } from 'vitest';
import { validateOverlaySchema } from '../../src/overlay/validate.js';
import type { OverlaySchema } from '../../src/types.js';
import { sheet } from './helpers.js';

const base = sheet('Rates', ['Lane', 'Vehicle Type', 'Base Rate'], [
  ['L1', 'Van', 100],
]);
const overlay = sheet('Surcharge', ['Vehicle Type', 'Fuel Pct'], [
  ['Van', 5],
]);

const validRules: OverlaySchema = {
  join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
  compose: {
    kind: 'rules',
    rules: [
      {
        op: 'percentIncrease',
        base: 'Base Rate',
        overlay: 'Fuel Pct',
        target: 'Effective Rate',
      },
    ],
  },
};

describe('validateOverlaySchema', () => {
  it('accepts a valid rules schema', () => {
    const result = validateOverlaySchema(validRules, base, overlay);
    expect(result.ok).toBe(true);
  });

  it('rejects empty join columns', () => {
    const result = validateOverlaySchema(
      {
        ...validRules,
        join: { base: [], overlay: [] },
      },
      base,
      overlay,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_SCHEMA');
  });

  it('rejects mismatched join lengths', () => {
    const result = validateOverlaySchema(
      {
        ...validRules,
        join: { base: ['Vehicle Type', 'Lane'], overlay: ['Vehicle Type'] },
      },
      base,
      overlay,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('Join column counts must match');
  });

  it('rejects missing join column in overlay (exact match)', () => {
    const result = validateOverlaySchema(
      {
        ...validRules,
        join: { base: ['Vehicle Type'], overlay: ['vehicle type'] },
      },
      base,
      overlay,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("'vehicle type'");
    expect(result.error.message).toContain("sheet 'Surcharge'");
  });

  it('rejects missing rule base column', () => {
    const result = validateOverlaySchema(
      {
        ...validRules,
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'add',
              base: 'Missing',
              overlay: 'Fuel Pct',
              target: 'T',
            },
          ],
        },
      },
      base,
      overlay,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("'Missing'");
  });

  it('rejects duplicate rule targets across numeric ops', () => {
    const result = validateOverlaySchema(
      {
        ...validRules,
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'add',
              base: 'Base Rate',
              overlay: 'Fuel Pct',
              target: 'X',
            },
            {
              op: 'multiply',
              base: 'Base Rate',
              overlay: 'Fuel Pct',
              target: 'X',
            },
          ],
        },
      },
      base,
      overlay,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('Duplicate rule target');
  });

  it('rejects missing passthrough column', () => {
    const result = validateOverlaySchema(
      { ...validRules, passthrough: ['Nope'] },
      base,
      overlay,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("'Nope'");
  });

  it('accepts fn compose without resolving rule columns', () => {
    const result = validateOverlaySchema(
      {
        join: { base: ['Vehicle Type'], overlay: ['Vehicle Type'] },
        compose: {
          kind: 'fn',
          fn: (row) => row,
        },
      },
      base,
      overlay,
    );
    expect(result.ok).toBe(true);
  });

  it('rejects invalid wildcardOnEmpty value', () => {
    const result = validateOverlaySchema(
      {
        ...validRules,
        join: {
          base: ['Vehicle Type'],
          overlay: ['Vehicle Type'],
          wildcardOnEmpty: 'both' as 'overlay',
        },
      },
      base,
      overlay,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('wildcardOnEmpty');
  });

  it('rejects missing join column in base', () => {
    const result = validateOverlaySchema(
      {
        ...validRules,
        join: { base: ['NoSuch'], overlay: ['Vehicle Type'] },
      },
      base,
      overlay,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("'NoSuch'");
    expect(result.error.message).toContain("sheet 'Rates'");
  });

  it('rejects missing rule overlay column', () => {
    const result = validateOverlaySchema(
      {
        ...validRules,
        compose: {
          kind: 'rules',
          rules: [
            {
              op: 'add',
              base: 'Base Rate',
              overlay: 'Missing',
              target: 'T',
            },
          ],
        },
      },
      base,
      overlay,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("'Missing'");
  });

  it('rejects missing replace overlay column', () => {
    const result = validateOverlaySchema(
      {
        ...validRules,
        compose: {
          kind: 'rules',
          rules: [{ op: 'replace', overlay: 'Gone', target: 'T' }],
        },
      },
      base,
      overlay,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("'Gone'");
  });

  it('rejects duplicate replace targets', () => {
    const result = validateOverlaySchema(
      {
        ...validRules,
        compose: {
          kind: 'rules',
          rules: [
            { op: 'replace', overlay: 'Fuel Pct', target: 'X' },
            { op: 'replace', overlay: 'Fuel Pct', target: 'X' },
          ],
        },
      },
      base,
      overlay,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('Duplicate rule target');
  });

  it('rejects duplicate passthrough targets', () => {
    const result = validateOverlaySchema(
      {
        ...validRules,
        compose: {
          kind: 'rules',
          rules: [
            { op: 'passthrough', from: 'base', source: 'Lane', target: 'Copy' },
            { op: 'passthrough', from: 'base', source: 'Lane', target: 'Copy' },
          ],
        },
      },
      base,
      overlay,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('Duplicate rule target');
  });

  it('rejects missing passthrough source on base', () => {
    const result = validateOverlaySchema(
      {
        ...validRules,
        compose: {
          kind: 'rules',
          rules: [
            { op: 'passthrough', from: 'base', source: 'Nope', target: 'X' },
          ],
        },
      },
      base,
      overlay,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("'Nope'");
  });

  it('defaults target to source when passthrough omits target', () => {
    const result = validateOverlaySchema(
      {
        ...validRules,
        compose: {
          kind: 'rules',
          rules: [{ op: 'passthrough', from: 'overlay', source: 'Fuel Pct' }],
        },
      },
      base,
      overlay,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.value.compose.kind !== 'rules') return;
    expect(result.value.compose.resolved[0]).toMatchObject({
      op: 'passthrough',
      target: 'Fuel Pct',
    });
  });
});
