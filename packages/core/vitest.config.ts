import { defineConfig } from 'vitest/config';

/** Node project: pure engine tests (no Worker / DOM). */
export default defineConfig({
  test: {
    name: 'node',
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/worker/**'],
    coverage: {
      provider: 'v8',
      include: ['src/diff/**/*.ts', 'src/normalize/**/*.ts'],
      thresholds: {
        branches: 90,
      },
    },
  },
});
