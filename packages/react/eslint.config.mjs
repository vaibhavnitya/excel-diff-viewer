import { baseConfig, boundaryConfig, parentImportPatterns } from '../../eslint.shared.mjs';

const message =
  'react imports only from core, never from ag-grid (PRINCIPLES.md section 4).';

export default [
  ...baseConfig,
  boundaryConfig({
    message,
    paths: [
      '@your-scope/excel-diff-ag-grid',
      'ag-grid-community',
      'ag-grid-react',
      'next',
    ],
    patterns: [
      '@your-scope/excel-diff-ag-grid/**',
      'ag-grid-community/**',
      'ag-grid-react/**',
      'next/**',
      ...parentImportPatterns(['ag-grid', 'apps']),
    ],
    zones: [
      { from: '../ag-grid', message },
      { from: '../../apps', message },
    ],
  }),
];
