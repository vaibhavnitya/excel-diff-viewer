import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PROGRESS_THROTTLE_MS,
  createProgressThrottle,
} from '../src/internal/progress-throttle.js';

describe('createProgressThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces rapid pushes and always flushes 100 immediately', () => {
    const flushed: number[] = [];
    const throttle = createProgressThrottle((pct) => {
      flushed.push(pct);
    });

    for (let i = 1; i <= 100; i += 1) {
      throttle.push(i === 100 ? 100 : i);
    }

    // First push flushes immediately; remainder coalesce until timer / 100.
    expect(flushed[0]).toBe(1);
    expect(flushed.includes(100)).toBe(true);
    expect(flushed.length).toBeLessThan(20);

    vi.advanceTimersByTime(PROGRESS_THROTTLE_MS);
    expect(flushed.length).toBeLessThan(25);
  });
});
