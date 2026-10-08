import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/diff/**/*.ts', 'src/normalize/**/*.ts'],
      // Done-when: >90% branch coverage on diff + normalize
      thresholds: {
        branches: 90,
      },
    },
  },
});
