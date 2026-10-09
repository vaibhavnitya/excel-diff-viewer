import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SiteNav } from '@/components/site-nav';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

import '@your-scope/excel-diff-ui/styles.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Excel Diff Viewer',
  description: 'View and diff Excel and CSV files in the browser.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <SiteNav />
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
