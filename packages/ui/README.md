# @your-scope/excel-diff-ui

Drop-in React components for viewing and diffing Excel/CSV files, built on AG Grid.

## Install

```bash
npm install @your-scope/excel-diff-ui ag-grid-community ag-grid-react
```

Also install `@your-scope/excel-diff-react` and `@your-scope/excel-diff-core` (workspace / peer deps as published).

## Minimal usage

```tsx
import { ExcelViewer, ExcelDiffViewer, ExcelSplitViewer } from '@your-scope/excel-diff-ui';
import '@your-scope/excel-diff-ui/styles.css';

<ExcelViewer file={file} height={600} />
<ExcelDiffViewer fileA={a} fileB={b} schema={schema} height={600} />
<ExcelSplitViewer fileA={a} fileB={b} schema={schema} height={600} />
```

Styling is opt-in via the CSS import. Theme with CSS variables (`--edv-*`) or override slots via the `classNames` prop.

## Public exports

| Export | Description |
| --- | --- |
| `ExcelViewer` | Single-file grid with sheet tabs |
| `ExcelDiffViewer` | Unified key-based diff grid + toolbar |
| `ExcelSplitViewer` | Side-by-side aligned panes |
| `diffToCSV` | Serialize a `DiffResult` to CSV |
| Prop / slot types | `ExcelViewerProps`, `ClassNameSlot`, … |

## Peer dependencies

- `react` / `react-dom` >= 18
- `ag-grid-community` / `ag-grid-react` ^36.2.0

## Docs

Full guides: [http://localhost:3000/docs](http://localhost:3000/docs) (demo app). Deployed URL coming soon.

See also `DESIGN.md` and `PRINCIPLES.md` in the monorepo root.
