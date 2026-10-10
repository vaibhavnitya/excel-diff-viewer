import type { PropRow } from '@/components/docs/props-table';

export const VIEWER_PROPS: readonly PropRow[] = [
  {
    name: 'file',
    type: 'File | ArrayBuffer | null',
    default: '—',
    description: 'File to parse and display. Pass null for the empty state.',
  },
  {
    name: 'defaultSheet',
    type: 'string',
    description: 'Sheet name to select on first load when present.',
  },
  {
    name: 'height',
    type: 'number | string',
    default: 'fill parent',
    description:
      'Explicit grid height (e.g. 600 or "80vh"). Parent must be sized if omitted.',
  },
  {
    name: 'limits',
    type: 'Partial<Limits>',
    description: 'Override default parse limits (file size, rows, columns, cells).',
  },
  {
    name: 'classNames',
    type: 'Partial<Record<ClassNameSlot, string>>',
    description: 'CSS class overrides for root, toolbar, grid, error, etc.',
  },
  {
    name: 'renderError',
    type: '(error: DiffError) => ReactNode',
    description: 'Replace the default error UI.',
  },
  {
    name: 'renderLoading',
    type: '(progress: number, phase?: string) => ReactNode',
    description: 'Replace the default loading UI. Progress is 0–1.',
  },
  {
    name: 'renderEmpty',
    type: '() => ReactNode',
    description: 'Replace the empty state when file is null.',
  },
  {
    name: 'onSheetChange',
    type: '(name: string) => void',
    description: 'Fired when the user switches sheets.',
  },
  {
    name: 'onError',
    type: '(error: DiffError) => void',
    description: 'Observability callback — does not replace renderError.',
  },
  {
    name: 'options',
    type: 'ParseFileOptions',
    description: 'Parse hints (filename, format, limits).',
  },
  {
    name: 'theme',
    type: 'Theme',
    description:
      'Design tokens mapped to --edv-* CSS variables on the root. Partial overrides only. See Styling.',
  },
  {
    name: 'style',
    type: 'CSSProperties',
    description: 'Inline styles on the root element (merged after theme).',
  },
  {
    name: 'agGridProps',
    type: 'Partial<AgGridReactProps>',
    description:
      'Passthrough to AgGridReact after library defaults. columnDefs are user-replaceable; rowData/getRowId are locked. See Filtering & sorting.',
  },
];

export const DIFF_PROPS: readonly PropRow[] = [
  {
    name: 'fileA',
    type: 'File | ArrayBuffer | null',
    default: '—',
    description: 'Before file.',
  },
  {
    name: 'fileB',
    type: 'File | ArrayBuffer | null',
    default: '—',
    description: 'After file.',
  },
  {
    name: 'schema',
    type: 'DiffSchema | null',
    default: '—',
    description:
      'Key/value schema. Diff stays idle until both files and schema are set.',
  },
  {
    name: 'height',
    type: 'number | string',
    default: 'fill parent',
    description: 'Explicit grid height.',
  },
  {
    name: 'showOnlyChanges',
    type: 'boolean',
    description: 'Filter to added / removed / modified rows.',
  },
  {
    name: 'onShowOnlyChangesChange',
    type: '(value: boolean) => void',
    description: 'Controlled filter callback.',
  },
  {
    name: 'searchQuery',
    type: 'string',
    description: 'Controlled search query across visible cells.',
  },
  {
    name: 'onSearchQueryChange',
    type: '(value: string) => void',
    description: 'Controlled search callback.',
  },
  {
    name: 'onDiffComplete',
    type: '(diff: DiffResult) => void',
    description: 'Called when a successful diff finishes.',
  },
  {
    name: 'enableCSVExport',
    type: 'boolean',
    description: 'Show the CSV export button in the toolbar.',
  },
  {
    name: 'exportFilename',
    type: 'string',
    description: 'Filename used for CSV download.',
  },
  {
    name: 'limits',
    type: 'Partial<Limits>',
    description: 'Parse / diff limits override.',
  },
  {
    name: 'classNames',
    type: 'Partial<Record<ClassNameSlot, string>>',
    description: 'CSS class slot overrides.',
  },
  {
    name: 'renderError',
    type: '(error: DiffError) => ReactNode',
    description: 'Custom error UI.',
  },
  {
    name: 'renderLoading',
    type: '(progress: number, phase?: string) => ReactNode',
    description: 'Custom loading UI.',
  },
  {
    name: 'renderEmpty',
    type: '() => ReactNode',
    description: 'Custom empty UI.',
  },
  {
    name: 'onError',
    type: '(error: DiffError) => void',
    description: 'Error observer for logging / analytics.',
  },
  {
    name: 'theme',
    type: 'Theme',
    description:
      'Design tokens mapped to --edv-* CSS variables on the root. Partial overrides only. See Styling.',
  },
  {
    name: 'style',
    type: 'CSSProperties',
    description: 'Inline styles on the root element (merged after theme).',
  },
  {
    name: 'agGridProps',
    type: 'Partial<AgGridReactProps>',
    description:
      'Passthrough to AgGridReact after library defaults. Diff columnDefs, rowData, getRowId, and getRowClass are locked. See Filtering & sorting.',
  },
];

export const SPLIT_PROPS: readonly PropRow[] = [
  {
    name: 'fileA',
    type: 'File | ArrayBuffer | null',
    default: '—',
    description: 'Left / before file.',
  },
  {
    name: 'fileB',
    type: 'File | ArrayBuffer | null',
    default: '—',
    description: 'Right / after file.',
  },
  {
    name: 'schema',
    type: 'DiffSchema | null',
    default: '—',
    description: 'Schema used to align rows by key.',
  },
  {
    name: 'labelA',
    type: 'string',
    description: 'Label above the left pane.',
  },
  {
    name: 'labelB',
    type: 'string',
    description: 'Label above the right pane.',
  },
  {
    name: 'height',
    type: 'number | string',
    default: 'fill parent',
    description: 'Explicit grid height.',
  },
  {
    name: 'onDiffComplete',
    type: '(diff: DiffResult) => void',
    description: 'Called when alignment / diff completes.',
  },
  {
    name: 'enableCSVExport',
    type: 'boolean',
    description: 'Show CSV export in the toolbar.',
  },
  {
    name: 'exportFilename',
    type: 'string',
    description: 'Filename for CSV download.',
  },
  {
    name: 'limits',
    type: 'Partial<Limits>',
    description: 'Parse / diff limits override.',
  },
  {
    name: 'classNames',
    type: 'Partial<Record<ClassNameSlot, string>>',
    description: 'CSS class slot overrides.',
  },
  {
    name: 'renderError',
    type: '(error: DiffError) => ReactNode',
    description: 'Custom error UI.',
  },
  {
    name: 'renderLoading',
    type: '(progress: number, phase?: string) => ReactNode',
    description: 'Custom loading UI.',
  },
  {
    name: 'renderEmpty',
    type: '() => ReactNode',
    description: 'Custom empty UI.',
  },
  {
    name: 'onError',
    type: '(error: DiffError) => void',
    description: 'Error observer.',
  },
  {
    name: 'theme',
    type: 'Theme',
    description:
      'Design tokens mapped to --edv-* CSS variables on the root. Partial overrides only. See Styling.',
  },
  {
    name: 'style',
    type: 'CSSProperties',
    description: 'Inline styles on the root element (merged after theme).',
  },
  {
    name: 'agGridProps',
    type: 'Partial<AgGridReactProps>',
    description:
      'Passthrough to both panes after library defaults. columnDefs, rowData, getRowId, and getRowClass are locked; scroll handlers are composed. See Filtering & sorting.',
  },
];

export const CSS_VARIABLES: readonly {
  name: string;
  light: string;
  dark: string;
  description: string;
}[] = [
  {
    name: '--edv-font-family',
    light: 'ui-sans-serif, system-ui, sans-serif',
    dark: '(inherited)',
    description: 'Font stack for the component tree',
  },
  {
    name: '--edv-font-size',
    light: '13px',
    dark: '(inherited)',
    description: 'Base font size',
  },
  {
    name: '--edv-header-weight',
    light: '600',
    dark: '(inherited)',
    description: 'Font weight for headers / selected tabs',
  },
  {
    name: '--edv-text-color',
    light: '#1a1a1a',
    dark: '#e8e8e8',
    description: 'Primary text',
  },
  {
    name: '--edv-bg-color',
    light: '#ffffff',
    dark: '#121212',
    description: 'Surface background',
  },
  {
    name: '--edv-border-color',
    light: '#d0d0d0',
    dark: '#333333',
    description: 'Borders and dividers',
  },
  {
    name: '--edv-border-radius',
    light: '0',
    dark: '(inherited)',
    description: 'Root and chrome border radius',
  },
  {
    name: '--edv-header-bg',
    light: '#f5f5f5',
    dark: '#1e1e1e',
    description: 'Column header background',
  },
  {
    name: '--edv-header-fg',
    light: '#1a1a1a',
    dark: '#e8e8e8',
    description: 'Column header text',
  },
  {
    name: '--edv-row-hover-bg',
    light: '#f0f0f0',
    dark: '#2a2a2a',
    description: 'Row hover',
  },
  {
    name: '--edv-key-column-bg',
    light: '#fafafa',
    dark: '#1a1a1a',
    description: 'Key column shading',
  },
  {
    name: '--edv-row-height',
    light: '32px',
    dark: '(inherited)',
    description: 'Row height token (also set via theme → AG Grid rowHeight)',
  },
  {
    name: '--edv-header-height',
    light: '36px',
    dark: '(inherited)',
    description: 'Header height token (also set via theme → AG Grid headerHeight)',
  },
  {
    name: '--edv-cell-padding',
    light: '0 8px',
    dark: '(inherited)',
    description: 'Cell padding',
  },
  {
    name: '--edv-added-bg / --edv-added-fg',
    light: '#dcfce7 / #14532d',
    dark: '#14532d / #bbf7d0',
    description: 'Added cells / rows',
  },
  {
    name: '--edv-removed-bg / --edv-removed-fg',
    light: '#fee2e2 / #7f1d1d',
    dark: '#7f1d1d / #fecaca',
    description: 'Removed cells / rows',
  },
  {
    name: '--edv-modified-bg / --edv-modified-fg',
    light: '#fef3c7 / #78350f',
    dark: '#78350f / #fde68a',
    description: 'Modified cells / rows',
  },
  {
    name: '--edv-error-bg / --edv-error-fg',
    light: '#fef2f2 / #991b1b',
    dark: '#3f1a1a / #fecaca',
    description: 'Error panels',
  },
  {
    name: '--edv-warning-bg / --edv-warning-fg',
    light: '#fffbeb / #92400e',
    dark: '#422006 / #fde68a',
    description: 'Warning panels (e.g. duplicate keys)',
  },
  {
    name: '--edv-loading-bg',
    light: '#f5f5f5',
    dark: '#1e1e1e',
    description: 'Loading state background',
  },
  {
    name: '--edv-toolbar-bg',
    light: '#fafafa',
    dark: '#1a1a1a',
    description: 'Toolbar background',
  },
  {
    name: '--edv-ghost-opacity',
    light: '0.45',
    dark: '0.45',
    description: 'Ghost row opacity in split view',
  },
  {
    name: '--edv-muted-fg',
    light: '#6b7280',
    dark: '#9ca3af',
    description: 'Secondary / muted text',
  },
];
