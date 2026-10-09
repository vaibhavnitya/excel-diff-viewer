import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'es2022',
  platform: 'neutral',
  // Declarations via `tsc -p tsconfig.build.json` (tsup dts + composite conflict).
  dts: false,
  sourcemap: true,
  clean: !options.watch,
  splitting: false,
  treeshake: true,
  external: [
    'react',
    'react-dom',
    'ag-grid-community',
    'ag-grid-react',
    '@mojro/excel-diff-core',
    '@mojro/excel-diff-react',
  ],
}));
