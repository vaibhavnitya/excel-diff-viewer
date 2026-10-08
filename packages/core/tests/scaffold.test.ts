import { describe, expect, it } from 'vitest';
import {
  PACKAGE_NAME,
  SCAFFOLD_DEPENDENCIES,
  parseFile,
  diffWorkbooks,
  inferSchema,
} from '../src/index.js';

describe('@your-scope/excel-diff-core', () => {
  it('exports the public engine API', () => {
    expect(PACKAGE_NAME).toBe('@your-scope/excel-diff-core');
    expect(SCAFFOLD_DEPENDENCIES).toEqual([]);
    expect(typeof parseFile).toBe('function');
    expect(typeof diffWorkbooks).toBe('function');
    expect(typeof inferSchema).toBe('function');
  });
});
