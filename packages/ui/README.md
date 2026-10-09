# @your-scope/excel-diff-ui

Drop-in React components for viewing and diffing Excel/CSV files, built on AG Grid.

## Install

```bash
npm install @your-scope/excel-diff-ui ag-grid-community ag-grid-react
```

## Usage

```tsx
import { ExcelViewer, ExcelDiffViewer, ExcelSplitViewer } from '@your-scope/excel-diff-ui';
import '@your-scope/excel-diff-ui/styles.css';

<ExcelViewer file={file} />
<ExcelDiffViewer fileA={a} fileB={b} schema={schema} />
<ExcelSplitViewer fileA={a} fileB={b} schema={schema} />
```

Styling is opt-in via the CSS import. Theme with CSS variables (`--edv-*`) or override slots via the `classNames` prop.

## Sizing

The components fill their parent container by default (`height: 100%`).
Make sure the parent has an explicit height, or pass the `height` prop:

```tsx
// Pass explicit height
<ExcelViewer file={file} height={600} />
<ExcelViewer file={file} height="80vh" />

// Or let it fill a sized parent
<div style={{ height: 500 }}>
  <ExcelViewer file={file} />
</div>
```

A 400px minimum height is enforced as a safety net so the grid stays visible
even if the parent is unsized.

## Peer dependencies

- `react` / `react-dom` >= 18
- `ag-grid-community` / `ag-grid-react` ^36.2.0

## Architecture

Depends on `@your-scope/excel-diff-react` (hooks) and `@your-scope/excel-diff-core` (types/engine). See `DESIGN.md` and `PRINCIPLES.md` in the monorepo root.
