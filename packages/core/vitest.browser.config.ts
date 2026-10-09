import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(rootDir, '../..');

/** Browser project: Worker client tests (Playwright + real Workers). */
export default defineConfig({
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
  test: {
    name: 'browser',
    include: [
      'tests/worker/**/*.test.ts',
      'tests/integration/end-to-end-worker.test.ts',
    ],
    // Playwright + Worker can keep the Vite server alive after the run.
    teardownTimeout: 10_000,
    browser: {
      enabled: true,
      provider: 'playwright',
      name: 'chromium',
      headless: true,
      isolate: true,
    },
  },
});
