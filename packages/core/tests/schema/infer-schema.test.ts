import { describe, expect, it } from 'vitest';
import { inferSchema } from '../../src/schema/infer-schema.js';

describe('inferSchema', () => {
  it('identifies origin and destination as keys', () => {
    const result = inferSchema(['origin', 'destination', 'base_rate', 'min_charge']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.keyFields).toEqual(['origin', 'destination']);
    expect(result.value.valueFields).toEqual(['base_rate', 'min_charge']);
    expect(result.value.optionalKeyFields).toEqual(['origin']);
  });

  it('is case-insensitive', () => {
    const result = inferSchema(['Origin', 'DESTINATION', 'Rate']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.keyFields).toEqual(['Origin', 'DESTINATION']);
  });

  it('returns SCHEMA_INFERENCE_FAILED when nothing matches', () => {
    const result = inferSchema(['foo', 'bar', 'baz']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SCHEMA_INFERENCE_FAILED');
  });

  it('allows extending keyCandidates', () => {
    const result = inferSchema(['lane_id', 'price'], {
      keyCandidates: ['lane_id'],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.keyFields).toEqual(['lane_id']);
    expect(result.value.valueFields).toEqual(['price']);
  });
});
