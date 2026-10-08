import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

/**
 * Public package entry. Expects `dist/worker.js` from `tsup.worker.config.ts`
 * so `__EMBEDDED_WORKER__` can feed the Blob URL fallback.
 */
const workerSource = readFileSync(new URL('./dist/worker.js', import.meta.url), 'utf8');

export default defineConfig((options) => ({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  target: 'es2022',
  platform: 'neutral',
  // Declarations emitted by `tsc -p tsconfig.build.json` (tsup dts struggles
  // with composite + `.js` extension imports in this package).
  dts: false,
  sourcemap: true,
  // Worker build already cleaned dist/; keep worker.js when bundling index.
  clean: false,
  splitting: false,
  treeshake: true,
  define: {
    __EMBEDDED_WORKER__: JSON.stringify(workerSource),
  },
  esbuildOptions(opts) {
    // Avoid tree-shaking the embedded worker string away in production minify.
    opts.legalComments = options.watch ? 'inline' : 'none';
  },
}));
