import { describe, expect, it } from 'vitest';
import { themeToCssVars } from '../src/theme-to-css-vars.js';

describe('themeToCssVars', () => {
  it('returns {} for undefined theme', () => {
    expect(themeToCssVars(undefined)).toEqual({});
  });

  it('returns {} for empty theme object', () => {
    expect(themeToCssVars({})).toEqual({});
  });

  it('emits only provided color variables', () => {
    expect(
      themeToCssVars({
        colors: { added: '#00ff00', bg: '#111111' },
      }),
    ).toEqual({
      '--edv-bg-color': '#111111',
      '--edv-added-bg': '#00ff00',
    });
  });

  it('appends px to numeric fontSize and spacing heights', () => {
    expect(
      themeToCssVars({
        typography: { fontSize: 14, headerWeight: 700 },
        spacing: { rowHeight: 40, headerHeight: 48 },
      }),
    ).toEqual({
      '--edv-font-size': '14px',
      '--edv-header-weight': '700',
      '--edv-row-height': '40px',
      '--edv-header-height': '48px',
    });
  });

  it('leaves string fontSize unchanged', () => {
    expect(
      themeToCssVars({ typography: { fontSize: '0.875rem' } }),
    ).toEqual({
      '--edv-font-size': '0.875rem',
    });
  });

  it('handles string and number borderRadius', () => {
    expect(
      themeToCssVars({ shape: { borderRadius: 4 } }),
    ).toEqual({
      '--edv-border-radius': '4px',
    });
    expect(
      themeToCssVars({ shape: { borderRadius: '0.5rem' } }),
    ).toEqual({
      '--edv-border-radius': '0.5rem',
    });
  });

  it('maps the full Theme surface to --edv-* variables', () => {
    const vars = themeToCssVars({
      colors: {
        bg: 'a',
        fg: 'b',
        border: 'c',
        headerBg: 'd',
        headerFg: 'e',
        rowHoverBg: 'f',
        keyColumnBg: 'g',
        added: 'h',
        addedFg: 'i',
        removed: 'j',
        removedFg: 'k',
        modified: 'l',
        modifiedFg: 'm',
        errorBg: 'n',
        errorFg: 'o',
        loadingBg: 'p',
        toolbarBg: 'q',
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        fontSize: 12,
        headerWeight: 500,
      },
      spacing: {
        rowHeight: 28,
        headerHeight: 34,
        cellPadding: '2px 6px',
      },
      shape: { borderRadius: 2 },
    });

    expect(vars).toEqual({
      '--edv-bg-color': 'a',
      '--edv-text-color': 'b',
      '--edv-border-color': 'c',
      '--edv-header-bg': 'd',
      '--edv-header-fg': 'e',
      '--edv-row-hover-bg': 'f',
      '--edv-key-column-bg': 'g',
      '--edv-added-bg': 'h',
      '--edv-added-fg': 'i',
      '--edv-removed-bg': 'j',
      '--edv-removed-fg': 'k',
      '--edv-modified-bg': 'l',
      '--edv-modified-fg': 'm',
      '--edv-error-bg': 'n',
      '--edv-error-fg': 'o',
      '--edv-loading-bg': 'p',
      '--edv-toolbar-bg': 'q',
      '--edv-font-family': 'Inter, sans-serif',
      '--edv-font-size': '12px',
      '--edv-header-weight': '500',
      '--edv-row-height': '28px',
      '--edv-header-height': '34px',
      '--edv-cell-padding': '2px 6px',
      '--edv-border-radius': '2px',
    });
  });
});
