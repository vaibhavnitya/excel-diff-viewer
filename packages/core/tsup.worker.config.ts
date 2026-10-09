import { defineConfig } from 'tsup';

/**
 * Intermediate self-contained Worker bundle. SheetJS + Papa Parse are inlined —
 * no externals, no dynamic import() (unreliable under bundler constraints).
 * Consumed only to embed into `index.js` / `index.cjs` via `__EMBEDDED_WORKER__`;
 * the published package does not ship a separate `worker.js`.
 */
export default defineConfig({
  entry: { worker: 'src/worker/worker.ts' },
  format: ['iife'],
  target: 'es2022',
  platform: 'browser',
  dts: false,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  noExternal: [/.*/],
  outExtension: () => ({ js: '.js' }),
});
