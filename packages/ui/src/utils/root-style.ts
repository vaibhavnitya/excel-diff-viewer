import type { CSSProperties } from 'react';
import type { Theme } from '../theme.js';
import { themeToCssVars } from '../theme-to-css-vars.js';

/**
 * Root style merge: theme CSS vars → height → user `style` (user wins).
 */
export function mergeRootStyle(
  theme: Theme | undefined,
  height: number | string | undefined,
  style: CSSProperties | undefined,
): CSSProperties {
  return {
    ...themeToCssVars(theme),
    ...(height !== undefined ? { height } : undefined),
    ...style,
  };
}
