import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KEY_CANDIDATES,
  DEFAULT_LIMITS,
  DEFAULT_NUMERIC_TOLERANCE,
  createDiffError,
  createWorker,
  diffWorkbooks,
  diffWorkbooksAsync,
  err,
  inferSchema,
  isErr,
  isOk,
  ok,
  parseFile,
} from '../src/index.js';

describe('@mojro/excel-diff-core public API', () => {
  it('exports the Tier-3 engine entry points and Result helpers', () => {
    expect(typeof parseFile).toBe('function');
    expect(typeof diffWorkbooks).toBe('function');
    expect(typeof diffWorkbooksAsync).toBe('function');
    expect(typeof inferSchema).toBe('function');
    expect(typeof createWorker).toBe('function');
    expect(typeof ok).toBe('function');
    expect(typeof err).toBe('function');
    expect(typeof isOk).toBe('function');
    expect(typeof isErr).toBe('function');
    expect(typeof createDiffError).toBe('function');
    expect(DEFAULT_LIMITS.maxRows).toBeGreaterThan(0);
    expect(DEFAULT_NUMERIC_TOLERANCE.absolute).toBe(1e-6);
    expect(DEFAULT_KEY_CANDIDATES).toContain('origin');
  });
});
