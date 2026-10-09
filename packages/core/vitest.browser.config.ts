import { buildSync } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(rootDir, '../..');

/**
 * Bundle the Worker the same way production does (self-contained script) so
 * browser tests exercise the Blob URL path with a non-empty WORKER_SOURCE.
 */
function embedWorkerSource(): string {
  const result = buildSync({
    entryPoints: [path.join(rootDir, 'src/worker/worker.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
  });
  const file = result.outputFiles[0];
  if (file === undefined) {
    throw new Error('esbuild produced no Worker output for Vitest define.');
  }
  return file.text;
}

/** Browser project: Worker client tests (Playwright + real Workers). */
export default defineConfig({
  define: {
    __EMBEDDED_WORKER__: JSON.stringify(embedWorkerSource()),
  },
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
