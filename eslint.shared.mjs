import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

/** Import specifiers that climb out of a package into a sibling folder. */
export function parentImportPatterns(folderNames, maxDepth = 6) {
  const patterns = [];
  for (const folderName of folderNames) {
    for (let depth = 1; depth <= maxDepth; depth += 1) {
      const prefix = `${'../'.repeat(depth)}${folderName}`;
      patterns.push(prefix, `${prefix}/**`);
    }
  }
  return patterns;
}

export const baseConfig = tseslint.config(
  {
    ignores: ['dist/**', '.tsbuild/**', '.next/**', 'node_modules/**', 'coverage/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);

/**
 * @param {{ paths?: string[], patterns?: string[], zones?: { from: string, message: string }[], message: string }} options
 */
export function boundaryConfig({ paths = [], patterns = [], zones = [], message }) {
  /** @type {import('eslint').Linter.RulesRecord} */
  const rules = {};

  if (paths.length > 0 || patterns.length > 0) {
    rules['no-restricted-imports'] = [
      'error',
      {
        ...(paths.length > 0
          ? { paths: paths.map((name) => ({ name, message })) }
          : {}),
        ...(patterns.length > 0 ? { patterns: [{ group: patterns, message }] } : {}),
      },
    ];
  }

  if (zones.length > 0) {
    rules['import/no-restricted-paths'] = [
      'error',
      {
        zones: zones.map((zone) => ({
          target: '.',
          from: zone.from,
          message: zone.message,
        })),
      },
    ];
  }

  return {
    files: ['**/*.{ts,tsx}'],
    plugins: { import: importPlugin },
    rules,
  };
}
