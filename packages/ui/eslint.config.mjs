import { baseConfig, boundaryConfig, parentImportPatterns } from '../../eslint.shared.mjs';

const message =
  'ui may import core and react, not the Next.js app (PRINCIPLES.md section 4).';

export default [
  ...baseConfig,
  boundaryConfig({
    message,
    paths: ['next'],
    patterns: ['next/**', ...parentImportPatterns(['apps'])],
    zones: [{ from: '../../apps', message }],
  }),
];
