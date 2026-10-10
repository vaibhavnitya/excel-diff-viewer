/**
 * Copy-paste reference: map a Carbon theme name → EDV `Theme`.
 *
 * Hex values are Carbon v11 tokens (white / g10 / g90 / g100).
 * Library packages never import Carbon — copy this file into your app.
 */
import type { Theme } from '@mojro/excel-diff-ui';

export type CarbonThemeName = 'white' | 'g10' | 'g90' | 'g100';

type Tokens = {
  background: string;
  textPrimary: string;
  borderSubtle: string;
  layer: string;
  backgroundHover: string;
  interactive: string;
  textOnColor: string;
  supportSuccessInverse: string;
  supportSuccess: string;
  supportErrorInverse: string;
  supportError: string;
  supportWarningInverse: string;
  supportWarning: string;
};

/** Carbon theme token hexes — see @carbon/themes / color token docs. */
const TOKENS: Record<CarbonThemeName, Tokens> = {
  white: {
    background: '#ffffff', textPrimary: '#161616', borderSubtle: '#e0e0e0',
    layer: '#f4f4f4', backgroundHover: '#e8e8e8', interactive: '#0f62fe',
    textOnColor: '#ffffff', supportSuccessInverse: '#defbe6', supportSuccess: '#0e6027',
    supportErrorInverse: '#fff1f1', supportError: '#da1e28',
    supportWarningInverse: '#fcf4d6', supportWarning: '#684e00',
  },
  g10: {
    background: '#f4f4f4', textPrimary: '#161616', borderSubtle: '#e0e0e0',
    layer: '#ffffff', backgroundHover: '#e8e8e8', interactive: '#0f62fe',
    textOnColor: '#ffffff', supportSuccessInverse: '#defbe6', supportSuccess: '#0e6027',
    supportErrorInverse: '#fff1f1', supportError: '#da1e28',
    supportWarningInverse: '#fcf4d6', supportWarning: '#684e00',
  },
  g90: {
    background: '#262626', textPrimary: '#f4f4f4', borderSubtle: '#525252',
    layer: '#393939', backgroundHover: '#333333', interactive: '#78a9ff',
    textOnColor: '#161616', supportSuccessInverse: '#044317', supportSuccess: '#42be65',
    supportErrorInverse: '#750e13', supportError: '#ff8389',
    supportWarningInverse: '#684e00', supportWarning: '#f1c21b',
  },
  g100: {
    background: '#161616', textPrimary: '#f4f4f4', borderSubtle: '#393939',
    layer: '#262626', backgroundHover: '#2c2c2c', interactive: '#78a9ff',
    textOnColor: '#161616', supportSuccessInverse: '#044317', supportSuccess: '#42be65',
    supportErrorInverse: '#750e13', supportError: '#ff8389',
    supportWarningInverse: '#684e00', supportWarning: '#f1c21b',
  },
};

/** Builds an EDV Theme from a Carbon theme name. */
export function createThemeFromCarbon(name: CarbonThemeName): Theme {
  const t = TOKENS[name];
  return {
    colors: {
      bg: t.background, // $background
      fg: t.textPrimary, // $text-primary
      border: t.borderSubtle, // $border-subtle
      headerBg: t.interactive, // brand / interactive
      headerFg: t.textOnColor,
      rowHoverBg: t.backgroundHover,
      keyColumnBg: t.layer, // $layer-01
      toolbarBg: t.layer,
      loadingBg: t.layer,
      added: t.supportSuccessInverse,
      addedFg: t.supportSuccess,
      removed: t.supportErrorInverse,
      removedFg: t.supportError,
      modified: t.supportWarningInverse,
      modifiedFg: t.supportWarning,
      errorBg: t.supportErrorInverse,
      errorFg: t.supportError,
    },
    typography: {
      fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
      fontSize: 14,
      headerWeight: 600,
    },
    shape: { borderRadius: 0 }, // Carbon is sharp by default
  };
}
