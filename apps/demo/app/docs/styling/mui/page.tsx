'use client';

import {
  Card,
  CardContent,
  IconButton,
  ScopedCssBaseline,
  ThemeProvider,
  Typography,
  createTheme,
  type Theme as MuiTheme,
} from '@mui/material';
import { ExcelDiffViewer } from '@mojro/excel-diff-ui';
import { RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { StylingBreadcrumb } from '@/components/docs/styling-breadcrumb';
import { PresetSwitcher, type PresetOption } from '@/components/preset-switcher';
import { createThemeFromMui } from '@/examples/mui-adapter';
import {
  getSampleFileA,
  getSampleFileB,
  SAMPLE_SCHEMA,
} from '@/lib/sample-data';

type MuiPresetId = 'light' | 'dark' | 'teal' | 'orange';

function buildMuiTheme(id: MuiPresetId): MuiTheme {
  switch (id) {
    case 'dark':
      return createTheme({ palette: { mode: 'dark' } });
    case 'teal':
      return createTheme({
        palette: {
          mode: 'light',
          primary: { main: '#0d9488' },
        },
      });
    case 'orange':
      return createTheme({
        palette: {
          mode: 'light',
          primary: { main: '#ea580c' },
        },
      });
    case 'light':
    default:
      return createTheme({ palette: { mode: 'light' } });
  }
}

const PRESETS: Array<PresetOption<MuiPresetId>> = [
  { id: 'light', label: 'MUI Light', value: 'light' },
  { id: 'dark', label: 'MUI Dark', value: 'dark' },
  { id: 'teal', label: 'MUI with Teal brand', value: 'teal' },
  { id: 'orange', label: 'MUI with Orange brand', value: 'orange' },
];

const ADAPTER_SNIPPET = `// apps/demo/examples/mui-adapter.ts (copy into your app)
import type { Theme as MuiTheme } from '@mui/material/styles';
import type { Theme } from '@mojro/excel-diff-ui';

export function createThemeFromMui(muiTheme: MuiTheme): Theme {
  const { palette, typography, shape } = muiTheme;
  return {
    colors: {
      bg: palette.background.default,
      fg: palette.text.primary,
      border: palette.divider,
      headerBg: palette.primary.main,
      headerFg: palette.primary.contrastText,
      added: palette.success.light,
      removed: palette.error.light,
      modified: palette.warning.light,
      // ... see full file for remaining mappings
    },
    typography: {
      fontFamily: typography.fontFamily,
      fontSize: typography.body2.fontSize,
    },
    shape: { borderRadius: shape.borderRadius },
  };
}`;

export default function MuiStylingDocsPage() {
  const [activeId, setActiveId] = useState<MuiPresetId>('light');
  const [nonce, setNonce] = useState(0);
  const fileA = useMemo(() => getSampleFileA(), [nonce]);
  const fileB = useMemo(() => getSampleFileB(), [nonce]);
  const muiTheme = useMemo(() => buildMuiTheme(activeId), [activeId]);
  const edvTheme = useMemo(() => createThemeFromMui(muiTheme), [muiTheme]);

  const usageSnippet = `import { ThemeProvider, createTheme } from '@mui/material';
import { ExcelDiffViewer } from '@mojro/excel-diff-ui';
import { createThemeFromMui } from './mui-adapter'; // your copy

const muiTheme = createTheme({ palette: { mode: '${activeId === 'dark' ? 'dark' : 'light'}'${
    activeId === 'teal'
      ? ", primary: { main: '#0d9488' }"
      : activeId === 'orange'
        ? ", primary: { main: '#ea580c' }"
        : ''
  } } });

<ThemeProvider theme={muiTheme}>
  <ExcelDiffViewer
    fileA={fileA}
    fileB={fileB}
    schema={schema}
    theme={createThemeFromMui(muiTheme)}
  />
</ThemeProvider>`;

  return (
    <div className="space-y-6">
      <StylingBreadcrumb current="MUI Integration" />
      <header className="space-y-3">
        <h1 className="scroll-mt-24 text-3xl font-semibold tracking-tight">
          MUI Integration
        </h1>
        <p className="leading-relaxed text-muted-foreground">
          Design-system code stays in your app. This page wraps only the preview
          in MUI&apos;s{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            ThemeProvider
          </code>{' '}
          (no global{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            CssBaseline
          </code>
          ) and maps the MUI theme to EDV via a copy-paste adapter. Precedence
          and philosophy: monorepo{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            DESIGN.md
          </code>{' '}
          → Theming philosophy. Also see the{' '}
          <a
            href="/docs/styling/decision-guide"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            decision guide
          </a>
          .
        </p>
      </header>

      <PresetSwitcher
        presets={PRESETS}
        activeId={activeId}
        onSelect={(p) => setActiveId(p.value)}
      />

      <ThemeProvider theme={muiTheme}>
        <ScopedCssBaseline>
          <Card variant="outlined" sx={{ overflow: 'hidden' }}>
            <CardContent
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                pb: 1,
              }}
            >
              <Typography variant="h6" component="h2">
                Sample diff
              </Typography>
              <IconButton
                aria-label="Reload sample files"
                size="small"
                onClick={() => setNonce((n) => n + 1)}
              >
                <RefreshCw className="h-4 w-4" />
              </IconButton>
            </CardContent>
            <CardContent sx={{ pt: 0 }}>
              <ExcelDiffViewer
                fileA={fileA}
                fileB={fileB}
                schema={SAMPLE_SCHEMA}
                height={360}
                theme={edvTheme}
              />
            </CardContent>
          </Card>
        </ScopedCssBaseline>
      </ThemeProvider>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          What maps from MUI → EDV
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">palette</strong> → colors
            (background, text, divider, success/error/warning, primary for
            headers)
          </li>
          <li>
            <strong className="text-foreground">typography</strong> → font family
            / size / header weight
          </li>
          <li>
            <strong className="text-foreground">shape</strong> → border radius
          </li>
        </ul>
      </section>

      <details className="rounded-lg border p-4">
        <summary className="cursor-pointer font-medium">
          Adapter helper (<code className="text-sm">createThemeFromMui</code>)
        </summary>
        <pre className="mt-3 overflow-x-auto rounded-md bg-muted/60 p-4 text-xs leading-relaxed">
          <code>{ADAPTER_SNIPPET}</code>
        </pre>
      </details>

      <details className="rounded-lg border p-4" open>
        <summary className="cursor-pointer font-medium">Consumer usage</summary>
        <pre className="mt-3 overflow-x-auto rounded-md bg-muted/60 p-4 text-xs leading-relaxed">
          <code>{usageSnippet}</code>
        </pre>
      </details>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Next steps
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <a
              href="/docs/styling"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Styling overview
            </a>
          </li>
          <li>
            <a
              href="/docs/styling/carbon"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Carbon Integration
            </a>
          </li>
          <li>
            <a
              href="/docs/styling/custom"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Custom Themes
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
