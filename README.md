# excel-diff-viewer

View and diff Excel/CSV files in the browser. Built for React and Next.js — parse and compare tabular workbooks with key-based matching, numeric tolerance, and Web Workers so the UI stays responsive.

**Status:** Early development — not yet published to npm.

**Live demo:** coming soon (run locally with `npm run dev`).

## Packages

| Package | Description |
| --- | --- |
| [`@mojro/excel-diff-core`](./packages/core) | Parsing + diff engine (framework-agnostic) |
| [`@mojro/excel-diff-react`](./packages/react) | React hooks for custom UIs |
| [`@mojro/excel-diff-ui`](./packages/ui) | Drop-in components using AG Grid |

## Install

```bash
npm install @mojro/excel-diff-ui @mojro/excel-diff-react @mojro/excel-diff-core react react-dom ag-grid-community ag-grid-react
```

## Minimal usage

```tsx
'use client';

import { useState } from 'react';
import { ExcelViewer, ExcelDiffViewer } from '@mojro/excel-diff-ui';
import '@mojro/excel-diff-ui/styles.css';

export function App() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <ExcelViewer file={file} height={600} />
    </>
  );
}
```

```tsx
<ExcelDiffViewer
  fileA={fileA}
  fileB={fileB}
  schema={{
    keyFields: ['origin', 'destination', 'mode'],
    optionalKeyFields: ['destination'],
    valueFields: ['rate'],
  }}
  height={600}
/>
```

## Documentation

- Demo docs (local): [http://localhost:3000/docs](http://localhost:3000/docs) after `npm run dev`
- Deployed docs URL: *coming soon*
- [DESIGN.md](./DESIGN.md) — architecture and the “why”
- [PRINCIPLES.md](./PRINCIPLES.md) — engineering principles
- [DEVELOPMENT.md](./DEVELOPMENT.md) — setup and daily workflow
- [ROADMAP.md](./ROADMAP.md) — phased build plan

## Develop locally

```bash
npm install
npm run dev
```

Demo runs at http://localhost:3000.

## License

MIT
# excel-diff-viewer
