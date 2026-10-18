import { defineConfig } from 'vitest/config';

/** Node project: pure engine tests (no Worker / DOM). */
export default defineConfig({
  test: {
    name: 'node',
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/worker/**', 'tests/integration/end-to-end-worker.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/diff/**/*.ts',
        'src/normalize/**/*.ts',
        'src/overlay/**/*.ts',
        'src/summary/**/*.ts',
        'src/write/**/*.ts',
      ],
      thresholds: {
        branches: 95,
      },
    },
  },
});
