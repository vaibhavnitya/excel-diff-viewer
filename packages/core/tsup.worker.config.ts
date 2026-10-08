import { defineConfig } from 'tsup';

/**
 * Self-contained Worker bundle (ESM). SheetJS + Papa Parse are inlined —
 * no externals, no dynamic import() (unreliable under bundler constraints).
 */
export default defineConfig({
  entry: { worker: 'src/worker/worker.ts' },
  format: ['esm'],
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
