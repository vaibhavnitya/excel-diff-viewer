import { baseConfig, boundaryConfig, parentImportPatterns } from '../../eslint.shared.mjs';

const message =
  'core imports nothing from this repo and no UI libraries (PRINCIPLES.md section 4).';

export default [
  ...baseConfig,
  boundaryConfig({
    message,
    paths: [
      '@mojro/excel-diff-react',
      '@mojro/excel-diff-ui',
      'react',
      'react-dom',
      'next',
      'ag-grid-community',
      'ag-grid-react',
    ],
    patterns: [
      '@mojro/excel-diff-react/**',
      '@mojro/excel-diff-ui/**',
      'react/**',
      'react-dom/**',
      'next/**',
      'ag-grid-community/**',
      'ag-grid-react/**',
      ...parentImportPatterns(['react', 'ui', 'apps']),
    ],
    zones: [
      { from: '../react', message },
      { from: '../ui', message },
      { from: '../../apps', message },
    ],
  }),
];
