export type DocsNavItem = {
  readonly href: string;
  readonly title: string;
  readonly description: string;
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
    href: '/docs/hooks',
    title: 'Hooks',
    description: 'useExcelFile and useExcelDiff for custom UIs',
  },
  {
    href: '/docs/styling',
    title: 'Styling',
    description: 'CSS variables, classNames, and themes',
  },
  {
    href: '/docs/errors',
    title: 'Errors',
    description: 'Error codes, recovery, and custom rendering',
  },
] as const;

export function docsTitleForPath(pathname: string): string {
  const exact = DOCS_NAV.find((item) => item.href === pathname);
  return exact?.title ?? 'Docs';
}
