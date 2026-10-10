import type { CSSProperties } from 'react';
import type { Theme } from './theme.js';

function asCssLength(value: string | number): string {
  return typeof value === 'number' ? `${value}px` : value;
}

/**
 * Translate a {@link Theme} into inline `--edv-*` CSS custom properties.
 * Pure: no side effects. Returns `{}` when `theme` is undefined.
 * Only fields present on `theme` are emitted — no fallbacks.
 */
export function themeToCssVars(theme: Theme | undefined): CSSProperties {
  if (theme === undefined) {
    return {};
  }

  const vars: Record<string, string> = {};
  const { colors, typography, spacing, shape } = theme;

  if (colors !== undefined) {
    if (colors.bg !== undefined) vars['--edv-bg-color'] = colors.bg;
    if (colors.fg !== undefined) vars['--edv-text-color'] = colors.fg;
    if (colors.border !== undefined) vars['--edv-border-color'] = colors.border;
    if (colors.headerBg !== undefined) vars['--edv-header-bg'] = colors.headerBg;
    if (colors.headerFg !== undefined) vars['--edv-header-fg'] = colors.headerFg;
    if (colors.rowHoverBg !== undefined) {
      vars['--edv-row-hover-bg'] = colors.rowHoverBg;
    }
    if (colors.keyColumnBg !== undefined) {
      vars['--edv-key-column-bg'] = colors.keyColumnBg;
    }
    if (colors.added !== undefined) vars['--edv-added-bg'] = colors.added;
    if (colors.addedFg !== undefined) vars['--edv-added-fg'] = colors.addedFg;
    if (colors.removed !== undefined) vars['--edv-removed-bg'] = colors.removed;
    if (colors.removedFg !== undefined) {
      vars['--edv-removed-fg'] = colors.removedFg;
    }
    if (colors.modified !== undefined) {
      vars['--edv-modified-bg'] = colors.modified;
    }
    if (colors.modifiedFg !== undefined) {
      vars['--edv-modified-fg'] = colors.modifiedFg;
    }
    if (colors.errorBg !== undefined) vars['--edv-error-bg'] = colors.errorBg;
    if (colors.errorFg !== undefined) vars['--edv-error-fg'] = colors.errorFg;
    if (colors.loadingBg !== undefined) {
      vars['--edv-loading-bg'] = colors.loadingBg;
    }
    if (colors.toolbarBg !== undefined) {
      vars['--edv-toolbar-bg'] = colors.toolbarBg;
    }
  }

  if (typography !== undefined) {
    if (typography.fontFamily !== undefined) {
      vars['--edv-font-family'] = typography.fontFamily;
    }
    if (typography.fontSize !== undefined) {
      vars['--edv-font-size'] = asCssLength(typography.fontSize);
    }
    if (typography.headerWeight !== undefined) {
      vars['--edv-header-weight'] = String(typography.headerWeight);
    }
  }

  if (spacing !== undefined) {
    if (spacing.rowHeight !== undefined) {
      vars['--edv-row-height'] = asCssLength(spacing.rowHeight);
    }
    if (spacing.headerHeight !== undefined) {
      vars['--edv-header-height'] = asCssLength(spacing.headerHeight);
    }
    if (spacing.cellPadding !== undefined) {
      vars['--edv-cell-padding'] = spacing.cellPadding;
    }
  }

  if (shape?.borderRadius !== undefined) {
    vars['--edv-border-radius'] = asCssLength(shape.borderRadius);
  }

  return vars as CSSProperties;
}
