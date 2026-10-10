import { describe, expect, it } from 'vitest';

import {
  createThemeFromCarbon,
  type CarbonThemeName,
} from '../examples/carbon-adapter';

const NAMES: CarbonThemeName[] = ['white', 'g10', 'g90', 'g100'];

describe('createThemeFromCarbon', () => {
  it.each(NAMES)('returns a full Theme shape for %s', (name) => {
    const theme = createThemeFromCarbon(name);

    expect(theme.colors?.bg).toMatch(/^#/);
    expect(theme.colors?.fg).toMatch(/^#/);
    expect(theme.colors?.border).toMatch(/^#/);
    expect(theme.colors?.headerBg).toMatch(/^#/);
    expect(theme.colors?.added).toMatch(/^#/);
    expect(theme.colors?.removed).toMatch(/^#/);
    expect(theme.colors?.modified).toMatch(/^#/);
    expect(theme.typography?.fontFamily).toContain('IBM Plex Sans');
    expect(theme.shape?.borderRadius).toBe(0);
  });

  it('uses light backgrounds for white/g10 and dark for g90/g100', () => {
    expect(createThemeFromCarbon('white').colors?.bg).toBe('#ffffff');
    expect(createThemeFromCarbon('g10').colors?.bg).toBe('#f4f4f4');
    expect(createThemeFromCarbon('g90').colors?.bg).toBe('#262626');
    expect(createThemeFromCarbon('g100').colors?.bg).toBe('#161616');
  });
});
