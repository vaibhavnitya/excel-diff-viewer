import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, '../styles.css'), 'utf8');

const REQUIRED_VARS = [
  '--edv-font-family',
  '--edv-font-size',
  '--edv-header-weight',
  '--edv-text-color',
  '--edv-bg-color',
  '--edv-border-color',
  '--edv-border-radius',
  '--edv-header-bg',
  '--edv-header-fg',
  '--edv-row-hover-bg',
  '--edv-key-column-bg',
  '--edv-row-height',
  '--edv-header-height',
  '--edv-cell-padding',
  '--edv-added-bg',
  '--edv-added-fg',
  '--edv-removed-bg',
  '--edv-removed-fg',
  '--edv-modified-bg',
  '--edv-modified-fg',
  '--edv-error-bg',
  '--edv-error-fg',
  '--edv-loading-bg',
  '--edv-toolbar-bg',
] as const;

describe('styles.css', () => {
  it('defines all public CSS variables on :root', () => {
    for (const name of REQUIRED_VARS) {
      expect(css).toContain(`${name}:`);
    }
  });

  it('provides dark-mode overrides', () => {
    expect(css).toContain(':root[data-theme=\'dark\']');
    expect(css).toMatch(/--edv-added-bg:\s*#14532d/);
  });

  it('ships light defaults for status colors', () => {
    expect(css).toMatch(/--edv-added-bg:\s*#dcfce7/);
    expect(css).toMatch(/--edv-removed-bg:\s*#fee2e2/);
    expect(css).toMatch(/--edv-modified-bg:\s*#fef3c7/);
  });

  it('enforces a 400px min-height safety net on grid containers', () => {
    expect(css).toMatch(/\[data-edv-grid\][\s\S]*min-height:\s*400px/);
    expect(css).toMatch(/\[data-edv-component\][\s\S]*height:\s*100%/);
  });
});
