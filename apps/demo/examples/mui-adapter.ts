/**
 * Copy-paste reference: map an MUI theme → EDV `Theme`.
 *
 * Not published — copy into your app. The library packages never import MUI.
 */
import type { Theme as MuiTheme } from '@mui/material/styles';
import type { Theme } from '@mojro/excel-diff-ui';

/**
 * Reads MUI palette / typography / shape and returns an EDV Theme object.
 * Every field is filled when MUI provides a value — consumers may strip fields.
 */
export function createThemeFromMui(muiTheme: MuiTheme): Theme {
  const { palette, typography, shape } = muiTheme;

  return {
    colors: {
      // Surfaces
      bg: palette.background.default,
      fg: palette.text.primary,
      border: palette.divider,
      toolbarBg: palette.background.paper,
      loadingBg: palette.background.paper,
      // Headers use brand primary so the grid feels “in” the MUI app
      headerBg: palette.primary.main,
      headerFg: palette.primary.contrastText,
      rowHoverBg: palette.action.hover,
      keyColumnBg: palette.action.selected,
      // Diff status → semantic palette lights / contrast
      added: palette.success.light,
      addedFg: palette.success.dark,
      removed: palette.error.light,
      removedFg: palette.error.dark,
      modified: palette.warning.light,
      modifiedFg: palette.warning.dark,
      errorBg: palette.error.light,
      errorFg: palette.error.dark,
    },
    typography: {
      fontFamily: typography.fontFamily,
      // body2 is closest to dense grid cell text
      fontSize: typography.body2.fontSize,
      headerWeight:
        typeof typography.fontWeightMedium === 'number'
          ? typography.fontWeightMedium
          : 500,
    },
    shape: {
      borderRadius: shape.borderRadius,
    },
  };
}
