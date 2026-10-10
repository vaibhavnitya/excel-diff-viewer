# @mojro/excel-diff-ui

Drop-in React components for viewing and diffing Excel/CSV files, built on AG Grid.

## Install

```bash
npm install @mojro/excel-diff-ui ag-grid-community ag-grid-react
```

Also install `@mojro/excel-diff-react` and `@mojro/excel-diff-core` (workspace / peer deps as published).

## Minimal usage

```tsx
import { ExcelViewer, ExcelDiffViewer, ExcelSplitViewer } from '@mojro/excel-diff-ui';
import '@mojro/excel-diff-ui/styles.css';

<ExcelViewer file={file} height={600} />
<ExcelDiffViewer fileA={a} fileB={b} schema={schema} height={600} />
<ExcelSplitViewer fileA={a} fileB={b} schema={schema} height={600} />
```

Styling is opt-in via the CSS import. The library does not bundle design systems.

## Theme

Pass a typed `Theme` (every field optional) to map design tokens onto `--edv-*`
CSS variables on the component root:

```tsx
import { ExcelViewer, type Theme } from '@mojro/excel-diff-ui';

const theme: Theme = {
  colors: {
    added: '#dcfce7',
    modified: '#fef3c7',
    removed: '#fee2e2',
    headerBg: '#f5f5f5',
  },
  typography: { fontSize: 14, headerWeight: 600 },
  spacing: { rowHeight: 36, headerHeight: 40 },
  shape: { borderRadius: 4 },
};

<ExcelViewer file={file} height={600} theme={theme} />
```

You can also override `--edv-*` in your CSS, or target slots with `classNames`.
Precedence and when to use each lever: monorepo `DESIGN.md` → **Theming
philosophy**, and the demo [decision guide](http://localhost:3000/docs/styling/decision-guide).

**Full `--edv-*` CSS variable reference** (single source of truth in docs):
[Custom Themes](http://localhost:3000/docs/styling/custom).

### Design system integration

Map your kit’s tokens to `Theme` in **your** app (copy-paste adapters — not
published from this package):

- [MUI Integration](http://localhost:3000/docs/styling/mui)
- [Carbon Integration](http://localhost:3000/docs/styling/carbon)
- [Custom Themes](http://localhost:3000/docs/styling/custom) — build without a kit

AG Grid’s own look is separate: pass `agGridProps.theme` (see
[AG Grid Themes](http://localhost:3000/docs/styling/ag-grid-themes)).

## Public exports

| Export | Description |
| --- | --- |
| `ExcelViewer` | Single-file grid with sheet tabs |
| `ExcelDiffViewer` | Unified key-based diff grid + toolbar |
| `ExcelSplitViewer` | Side-by-side aligned panes |
| `diffToCSV` | Serialize a `DiffResult` to CSV |
| `Theme` | Design-token shape for the `theme` prop |
| Prop / slot types | `ExcelViewerProps`, `ClassNameSlot`, … |

## Peer dependencies

- `react` / `react-dom` >= 18
- `ag-grid-community` / `ag-grid-react` ^36.2.0

## Docs

Full guides: [http://localhost:3000/docs](http://localhost:3000/docs) (demo app). Deployed URL coming soon.

See also `DESIGN.md` and `PRINCIPLES.md` in the monorepo root.
