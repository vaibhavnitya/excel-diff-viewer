'use client';

import {
  themeAlpine,
  themeBalham,
  themeMaterial,
  themeQuartz,
  type Theme as AgGridTheme,
} from 'ag-grid-community';
import { ExcelDiffViewer } from '@mojro/excel-diff-ui';
import { useMemo, useState } from 'react';

import { StylingBreadcrumb } from '@/components/docs/styling-breadcrumb';
import { PresetSwitcher, type PresetOption } from '@/components/preset-switcher';
import {
  getSampleFileA,
  getSampleFileB,
  SAMPLE_SCHEMA,
} from '@/lib/sample-data';

type AgThemeId = 'quartz' | 'alpine' | 'balham' | 'material';

const PRESETS: Array<PresetOption<AgGridTheme> & { blurb: string }> = [
  {
    id: 'quartz',
    label: 'Quartz',
    value: themeQuartz,
    blurb: 'Default modern look — clean density, soft separators (library default).',
  },
  {
    id: 'alpine',
    label: 'Alpine',
    value: themeAlpine,
    blurb: 'Light, airy chrome with generous spacing — good for dashboards.',
  },
  {
    id: 'balham',
    label: 'Balham',
    value: themeBalham,
    blurb: 'Compact, traditional grid styling — denser rows for data-heavy views.',
  },
  {
    id: 'material',
    label: 'Material',
    value: themeMaterial,
    blurb: 'Material Design–inspired elevation and typography cues.',
  },
];

const IMPORT_NAME: Record<AgThemeId, string> = {
  quartz: 'themeQuartz',
  alpine: 'themeAlpine',
  balham: 'themeBalham',
  material: 'themeMaterial',
};

export default function AgGridThemesDocsPage() {
  const [activeId, setActiveId] = useState<AgThemeId>('quartz');
  const fileA = useMemo(() => getSampleFileA(), []);
  const fileB = useMemo(() => getSampleFileB(), []);
  const preset = PRESETS.find((p) => p.id === activeId) ?? PRESETS[0]!;
  const themeImport = IMPORT_NAME[activeId];

  const snippet = `import { ${themeImport} } from 'ag-grid-community';
import { ExcelDiffViewer } from '@mojro/excel-diff-ui';

<ExcelDiffViewer
  fileA={fileA}
  fileB={fileB}
  schema={schema}
  height={400}
  agGridProps={{
    theme: ${themeImport},
  }}
/>`;

  return (
    <div className="space-y-6">
      <StylingBreadcrumb current="AG Grid Themes" />
      <header className="space-y-3">
        <h1 className="scroll-mt-24 text-3xl font-semibold tracking-tight">
          AG Grid Themes
        </h1>
        <p className="leading-relaxed text-muted-foreground">
          All four themes below are AG Grid Community Theming API objects.
          Pass them through{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            agGridProps.theme
          </code>
          . Enterprise-only configuration is not used.
        </p>
      </header>

      <PresetSwitcher
        presets={PRESETS}
        activeId={activeId}
        onSelect={(p) => setActiveId(p.id as AgThemeId)}
      />

      <p className="text-sm text-muted-foreground">{preset.blurb}</p>

      <div className="overflow-hidden rounded-lg border">
        <ExcelDiffViewer
          fileA={fileA}
          fileB={fileB}
          schema={SAMPLE_SCHEMA}
          height={400}
          agGridProps={{ theme: preset.value }}
        />
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Usage</h2>
        <pre className="overflow-x-auto rounded-lg border bg-muted/60 p-4 text-sm leading-relaxed">
          <code>{snippet}</code>
        </pre>
      </section>
    </div>
  );
}
