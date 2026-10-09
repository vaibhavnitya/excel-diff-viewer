'use client';

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { useEffect, type ReactNode } from 'react';

function DataThemeSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark' || resolvedTheme === 'light') {
      root.dataset.theme = resolvedTheme;
    } else {
      delete root.dataset.theme;
    }
  }, [resolvedTheme]);

  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <DataThemeSync />
      {children}
    </NextThemesProvider>
  );
}
