'use client';

import { ExcelViewer } from '@your-scope/excel-diff-ui';
import { useMemo, useState, type CSSProperties } from 'react';

import { Button } from '@/components/ui/button';
import { getSampleFileA } from '@/lib/sample-data';
import { cn } from '@/lib/utils';

type ThemePreset = {
  id: string;
  label: string;
  vars: Record<string, string>;
};

const PRESETS: readonly ThemePreset[] = [
  {
    id: 'light',
    label: 'Default light',
    vars: {
      '--edv-text-color': '#1a1a1a',
      '--edv-bg-color': '#ffffff',
      '--edv-border-color': '#d0d0d0',
      '--edv-header-bg': '#f5f5f5',
      '--edv-header-fg': '#1a1a1a',
      '--edv-added-bg': '#dcfce7',
      '--edv-added-fg': '#14532d',
      '--edv-removed-bg': '#fee2e2',
      '--edv-removed-fg': '#7f1d1d',
      '--edv-modified-bg': '#fef3c7',
      '--edv-modified-fg': '#78350f',
      '--edv-toolbar-bg': '#fafafa',
    },
  },
  {
    id: 'dark',
    label: 'Default dark',
    vars: {
      '--edv-text-color': '#e8e8e8',
      '--edv-bg-color': '#121212',
      '--edv-border-color': '#333333',
      '--edv-header-bg': '#1e1e1e',
      '--edv-header-fg': '#e8e8e8',
      '--edv-added-bg': '#14532d',
      '--edv-added-fg': '#bbf7d0',
      '--edv-removed-bg': '#7f1d1d',
      '--edv-removed-fg': '#fecaca',
      '--edv-modified-bg': '#78350f',
      '--edv-modified-fg': '#fde68a',
      '--edv-toolbar-bg': '#1a1a1a',
    },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    vars: {
      '--edv-text-color': '#0f172a',
      '--edv-bg-color': '#f0fdfa',
      '--edv-border-color': '#99f6e4',
      '--edv-header-bg': '#ccfbf1',
      '--edv-header-fg': '#134e4a',
      '--edv-added-bg': '#a7f3d0',
      '--edv-added-fg': '#064e3b',
      '--edv-removed-bg': '#fecdd3',
      '--edv-removed-fg': '#9f1239',
      '--edv-modified-bg': '#bae6fd',
      '--edv-modified-fg': '#0c4a6e',
      '--edv-toolbar-bg': '#e6fffa',
    },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    vars: {
      '--edv-text-color': '#1c1917',
      '--edv-bg-color': '#fff7ed',
      '--edv-border-color': '#fdba74',
      '--edv-header-bg': '#ffedd5',
      '--edv-header-fg': '#9a3412',
      '--edv-added-bg': '#bbf7d0',
      '--edv-added-fg': '#14532d',
      '--edv-removed-bg': '#fecaca',
      '--edv-removed-fg': '#7f1d1d',
      '--edv-modified-bg': '#fed7aa',
      '--edv-modified-fg': '#9a3412',
      '--edv-toolbar-bg': '#fffbeb',
    },
  },
] as const;

function cssBlock(vars: Record<string, string>): string {
  const lines = Object.entries(vars).map(([key, value]) => `  ${key}: ${value};`);
  return ['.my-viewer {', ...lines, '}'].join('\n');
}

export function ThemeSwitcherDemo() {
  const [presetId, setPresetId] = useState('light');
  const file = useMemo(() => getSampleFileA(), []);
  const preset = PRESETS.find((item) => item.id === presetId) ?? PRESETS[0]!;

  return (
    <div className="my-8 space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={item.id === presetId ? 'default' : 'outline'}
            onClick={() => setPresetId(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div
        className={cn('overflow-hidden rounded-md border')}
        style={preset.vars as CSSProperties}
      >
        <ExcelViewer file={file} height={280} />
      </div>

      <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
        <code>{cssBlock(preset.vars)}</code>
      </pre>
    </div>
  );
}
