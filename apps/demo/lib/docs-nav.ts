export type DocsNavItem = {
  readonly href: string;
  readonly title: string;
  readonly description: string;
  readonly children?: readonly DocsNavItem[];
};

export const DOCS_NAV: readonly DocsNavItem[] = [
  {
    href: '/docs',
    title: 'Overview',
    description: 'What the docs cover and how to jump in',
  },
  {
    href: '/docs/getting-started',
    title: 'Getting started',
    description: 'Install, peer deps, and a hello-world example',
  },
  {
    href: '/docs/core-concepts',
    title: 'Core concepts',
    description: 'Packages, schema, and keyed matching',
  },
  {
    href: '/docs/viewer',
    title: 'Viewer',
    description: 'ExcelViewer props and patterns',
  },
  {
    href: '/docs/diff',
    title: 'Diff',
    description: 'ExcelDiffViewer, schema, and CSV export',
  },
  {
    href: '/docs/split',
    title: 'Split',
    description: 'Side-by-side ExcelSplitViewer',
  },
  {
    href: '/docs/overlay',
    title: 'Overlay',
    description: 'Join and compose two workbooks into a derived one',
    children: [
      {
        href: '/docs/overlay/overview',
        title: 'Overview',
        description: 'What overlay is (and is not)',
      },
      {
        href: '/docs/overlay/schema',
        title: 'Schema',
        description: 'OverlaySchema, ops, wildcards, errors',
      },
      {
        href: '/docs/overlay/examples',
        title: 'Examples',
        description: 'Fuel surcharge, fees, and real-shaped cards',
      },
    ],
  },
  {
    href: '/docs/analytics',
    title: 'Analytics',
    description: 'Workbook, diff, and overlay summary primitives',
    children: [
      {
        href: '/docs/analytics/overview',
        title: 'Overview',
        description: 'summarizeWorkbook and inline DiffSummary / OverlaySummary',
      },
      {
        href: '/docs/analytics/components',
        title: 'Components',
        description: 'WorkbookSummary, DiffSummary, OverlaySummary',
      },
      {
        href: '/docs/analytics/hooks',
        title: 'Hooks',
        description: 'useWorkbookSummary sync/async and cache',
      },
      {
        href: '/docs/analytics/examples',
        title: 'Examples',
        description: 'Defaults, overlay panel, Recharts escape hatch',
      },
    ],
  },
  {
    href: '/docs/hooks',
    title: 'Hooks',
    description: 'useExcelFile and useExcelDiff for custom UIs',
  },
  {
    href: '/docs/filtering-and-sorting',
    title: 'Filtering & sorting',
    description: 'agGridProps, defaults, and locked AG Grid settings',
  },
  {
    href: '/docs/styling',
    title: 'Styling',
    description: 'CSS variables, theme prop, classNames, and design-system guides',
    children: [
      {
        href: '/docs/styling/basics',
        title: 'Basics',
        description: 'CSS variables, theme prop, and presets',
      },
      {
        href: '/docs/styling/ag-grid-themes',
        title: 'AG Grid Themes',
        description: 'Quartz, Alpine, Balham, Material',
      },
      {
        href: '/docs/styling/mui',
        title: 'MUI Integration',
        description: 'Map MUI themes to EDV Theme',
      },
      {
        href: '/docs/styling/carbon',
        title: 'Carbon Integration',
        description: 'Map Carbon themes to EDV Theme',
      },
      {
        href: '/docs/styling/custom',
        title: 'Custom Themes',
        description: 'Full --edv-* and Theme reference',
      },
      {
        href: '/docs/styling/decision-guide',
        title: 'Decision guide',
        description: 'When to use CSS variables, theme, classNames, or AG Grid themes',
      },
    ],
  },
  {
    href: '/docs/errors',
    title: 'Errors',
    description: 'Error codes, recovery, and custom rendering',
  },
] as const;

function flattenNav(items: readonly DocsNavItem[]): DocsNavItem[] {
  const out: DocsNavItem[] = [];
  for (const item of items) {
    out.push(item);
    if (item.children) {
      out.push(...flattenNav(item.children));
    }
  }
  return out;
}

export function docsTitleForPath(pathname: string): string {
  const exact = flattenNav(DOCS_NAV).find((item) => item.href === pathname);
  return exact?.title ?? 'Docs';
}
