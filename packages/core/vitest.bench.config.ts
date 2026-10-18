import { defineConfig } from 'vitest/config';

/** Benchmark-only config — not used by the unit test suite. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['bench/**/*.bench.ts'],
  },
});
