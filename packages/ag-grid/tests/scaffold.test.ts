import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME, SCAFFOLD_DEPENDENCIES } from '../src/index.js';

describe('@your-scope/excel-diff-ag-grid', () => {
  it('depends on core and react', () => {
    expect(PACKAGE_NAME).toBe('@your-scope/excel-diff-ag-grid');
    expect(SCAFFOLD_DEPENDENCIES).toEqual([
      '@your-scope/excel-diff-core',
      '@your-scope/excel-diff-react',
    ]);
  });
});
