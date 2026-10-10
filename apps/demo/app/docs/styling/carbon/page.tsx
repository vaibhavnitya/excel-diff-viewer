'use client';

import { Button, TextInput, Theme as CarbonTheme } from '@carbon/react';
import { ExcelDiffViewer } from '@mojro/excel-diff-ui';
import { useMemo, useState } from 'react';

// Page-scoped Carbon CSS — do not import from the root layout.
import '@carbon/styles/css/styles.css';

import { StylingBreadcrumb } from '@/components/docs/styling-breadcrumb';
import { PresetSwitcher, type PresetOption } from '@/components/preset-switcher';
import {
  createThemeFromCarbon,
  type CarbonThemeName,
} from '@/examples/carbon-adapter';
import {
  getSampleFileA,
  getSampleFileB,
  SAMPLE_SCHEMA,
} from '@/lib/sample-data';

const PRESETS: Array<PresetOption<CarbonThemeName>> = [
  { id: 'white', label: 'Carbon White', value: 'white' },
  { id: 'g10', label: 'Carbon g10', value: 'g10' },
  { id: 'g90', label: 'Carbon g90', value: 'g90' },
  { id: 'g100', label: 'Carbon g100', value: 'g100' },
];

const ADAPTER_SNIPPET = [
  '// apps/demo/examples/carbon-adapter.ts (copy into your app)',
  "import type { Theme } from '@mojro/excel-diff-ui';",
  '',
  "export type CarbonThemeName = 'white' | 'g10' | 'g90' | 'g100';",
  '',
  'export function createThemeFromCarbon(name: CarbonThemeName): Theme {',
  '  // Looks up Carbon theme token hexes (background, text-primary, ...)',
  '  // and returns an EDV Theme. See the full file for the token table.',
  '}',
].join('\n');

export default function CarbonStylingDocsPage() {
  const [activeId, setActiveId] = useState('white' as CarbonThemeName);
  const [filterHint, setFilterHint] = useState('origin');
  const fileA = useMemo(() => getSampleFileA(), []);
  const fileB = useMemo(() => getSampleFileB(), []);
  const edvTheme = useMemo(() => createThemeFromCarbon(activeId), [activeId]);

  const usageSnippet = [
    "import { Theme } from '@carbon/react';",
    "import { ExcelDiffViewer } from '@mojro/excel-diff-ui';",
    "import { createThemeFromCarbon } from './carbon-adapter'; // your copy",
    "import '@carbon/styles/css/styles.css'; // page-level only",
    '',
    `<Theme theme="${activeId}">`,
    '  <ExcelDiffViewer',
    '    fileA={fileA}',
    '    fileB={fileB}',
    '    schema={schema}',
    `    theme={createThemeFromCarbon('${activeId}')}`,
    '  />',
    '</Theme>',
  ].join('\n');

  return (
    <div className="space-y-6">
      <StylingBreadcrumb current="Carbon Integration" />
      <header className="space-y-3">
        <h1 className="scroll-mt-24 text-3xl font-semibold tracking-tight">
          Carbon Integration
        </h1>
        <p className="leading-relaxed text-muted-foreground">
          Carbon styles are imported only on this page. Site chrome (nav,
          sidebar) stays on shadcn/ui. The preview uses Carbon&apos;s{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            Theme
          </code>{' '}
          wrapper; EDV colors come from a copy-paste adapter keyed by theme
          name.
        </p>
      </header>

      <PresetSwitcher
        presets={PRESETS}
        activeId={activeId}
        onSelect={(p) => setActiveId(p.value)}
      />

      <CarbonTheme theme={activeId}>
        <div className="space-y-3 overflow-hidden rounded-lg border p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[12rem] flex-1">
              <TextInput
                id="carbon-filter-hint"
                labelText="Sample field label"
                value={filterHint}
                onChange={(e) => setFilterHint(e.target.value)}
              />
            </div>
            <Button kind="primary" size="md" type="button">
              Carbon Button
            </Button>
          </div>
          <div className="min-h-0 overflow-hidden" style={{ height: 360 }}>
            <ExcelDiffViewer
              fileA={fileA}
              fileB={fileB}
              schema={SAMPLE_SCHEMA}
              height={360}
              theme={edvTheme}
            />
          </div>
        </div>
      </CarbonTheme>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          What maps from Carbon → EDV
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Theme name → token hex table (background, text-primary,
            border-subtle, layer, support-* )
          </li>
          <li>Interactive / brand blue → header colors</li>
          <li>IBM Plex Sans + sharp corners (Carbon defaults)</li>
        </ul>
      </section>

      <details className="rounded-lg border p-4">
        <summary className="cursor-pointer font-medium">
          Adapter helper (
          <code className="text-sm">createThemeFromCarbon</code>)
        </summary>
        <pre className="mt-3 overflow-x-auto rounded-md bg-muted/60 p-4 text-xs leading-relaxed">
          <code>{ADAPTER_SNIPPET}</code>
        </pre>
        <p className="mt-2 text-sm text-muted-foreground">
          Full source:{' '}
          <code className="font-mono text-xs">
            apps/demo/examples/carbon-adapter.ts
          </code>
        </p>
      </details>

      <details className="rounded-lg border p-4" open>
        <summary className="cursor-pointer font-medium">Consumer usage</summary>
        <pre className="mt-3 overflow-x-auto rounded-md bg-muted/60 p-4 text-xs leading-relaxed">
          <code>{usageSnippet}</code>
        </pre>
      </details>
    </div>
  );
}
