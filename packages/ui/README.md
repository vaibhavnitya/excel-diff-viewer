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

Styling is opt-in via the CSS import. Theme with CSS variables (`--edv-*`), the typed `theme` prop (design tokens → CSS vars on the root), or override slots via the `classNames` prop. The library does not bundle design systems.

Design-system integration (MUI, Carbon, etc.) belongs in your app. The demo documents copy-paste adapters at `/docs/styling/mui` and `/docs/styling/carbon`.

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
