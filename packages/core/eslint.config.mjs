import { baseConfig, boundaryConfig, parentImportPatterns } from '../../eslint.shared.mjs';

const message =
  'core imports nothing from this repo and no UI libraries (PRINCIPLES.md section 4).';

export default [
  ...baseConfig,
  boundaryConfig({
    message,
    paths: [
      '@your-scope/excel-diff-react',
      '@your-scope/excel-diff-ag-grid',
      'react',
      'react-dom',
      'next',
      'ag-grid-community',
      'ag-grid-react',
    ],
    patterns: [
      '@your-scope/excel-diff-react/**',
      '@your-scope/excel-diff-ag-grid/**',
      'react/**',
      'react-dom/**',
      'next/**',
      'ag-grid-community/**',
      'ag-grid-react/**',
      ...parentImportPatterns(['react', 'ag-grid', 'apps']),
    ],
    zones: [
      { from: '../react', message },
      { from: '../ag-grid', message },
      { from: '../../apps', message },
    ],
  }),
];
