import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME, SCAFFOLD_DEPENDENCIES } from '../src/index.js';

describe('@your-scope/excel-diff-core', () => {
  it('is the innermost package', () => {
    expect(PACKAGE_NAME).toBe('@your-scope/excel-diff-core');
    expect(SCAFFOLD_DEPENDENCIES).toEqual([]);
  });
});
