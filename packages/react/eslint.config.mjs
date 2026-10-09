import { baseConfig, boundaryConfig, parentImportPatterns } from '../../eslint.shared.mjs';

const message =
  'react imports only from core, never from ui (PRINCIPLES.md section 4).';

export default [
  ...baseConfig,
  boundaryConfig({
    message,
    paths: [
      '@your-scope/excel-diff-ui',
      'ag-grid-community',
      'ag-grid-react',
      'next',
    ],
    patterns: [
      '@your-scope/excel-diff-ui/**',
      'ag-grid-community/**',
      'ag-grid-react/**',
      'next/**',
      ...parentImportPatterns(['ui', 'apps']),
    ],
    zones: [
      { from: '../ui', message },
      { from: '../../apps', message },
    ],
  }),
];
