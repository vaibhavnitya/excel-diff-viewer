import { createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import { createThemeFromMui } from '../examples/mui-adapter';

describe('createThemeFromMui', () => {
  it('maps light palette surfaces and semantic colors', () => {
    const mui = createTheme({ palette: { mode: 'light' } });
    const theme = createThemeFromMui(mui);

    expect(theme.colors?.bg).toBe(mui.palette.background.default);
    expect(theme.colors?.fg).toBe(mui.palette.text.primary);
    expect(theme.colors?.border).toBe(mui.palette.divider);
    expect(theme.colors?.headerBg).toBe(mui.palette.primary.main);
    expect(theme.colors?.headerFg).toBe(mui.palette.primary.contrastText);
    expect(theme.colors?.added).toBe(mui.palette.success.light);
    expect(theme.colors?.removed).toBe(mui.palette.error.light);
    expect(theme.colors?.modified).toBe(mui.palette.warning.light);
    expect(theme.typography?.fontFamily).toBe(mui.typography.fontFamily);
    expect(theme.typography?.fontSize).toBe(mui.typography.body2.fontSize);
    expect(theme.shape?.borderRadius).toBe(mui.shape.borderRadius);
  });

  it('maps dark mode and branded primary', () => {
    const mui = createTheme({
      palette: { mode: 'dark', primary: { main: '#0d9488' } },
    });
    const theme = createThemeFromMui(mui);

    expect(theme.colors?.bg).toBe(mui.palette.background.default);
    expect(theme.colors?.headerBg).toBe('#0d9488');
    expect(mui.palette.mode).toBe('dark');
  });
});
