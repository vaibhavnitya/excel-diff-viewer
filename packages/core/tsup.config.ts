import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'es2022',
  platform: 'neutral',
  // Declarations emitted by `tsc -p tsconfig.build.json` (tsup dts struggles
  // with composite + `.js` extension imports in this package).
  dts: false,
  sourcemap: true,
  clean: !options.watch,
  splitting: false,
  treeshake: true,
}));
