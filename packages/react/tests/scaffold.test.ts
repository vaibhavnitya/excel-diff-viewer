import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME, SCAFFOLD_DEPENDENCIES } from '../src/index.js';

describe('@your-scope/excel-diff-react', () => {
  it('depends only on core', () => {
    expect(PACKAGE_NAME).toBe('@your-scope/excel-diff-react');
    expect(SCAFFOLD_DEPENDENCIES).toEqual(['@your-scope/excel-diff-core']);
  });
});
