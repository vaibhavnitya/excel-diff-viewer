# @your-scope/excel-diff-react

React hooks for loading and diffing Excel and CSV files. No grid and no opinionated DOM.

**Requires React 18+** (`react` and `react-dom` are peer dependencies).

Imports `@your-scope/excel-diff-core` only. Drop-in components live in `@your-scope/excel-diff-ui`.

## Install

```bash
npm install @your-scope/excel-diff-react @your-scope/excel-diff-core
```

## Minimal usage

```tsx
import { useExcelFile, useExcelDiff } from '@your-scope/excel-diff-react';
import type { DiffSchema } from '@your-scope/excel-diff-react';

const fileState = useExcelFile(file);
// idle | loading | success | error

const schema: DiffSchema = {
  keyFields: ['origin', 'destination'],
  valueFields: ['rate'],
};
const diffState = useExcelDiff(fileA, fileB, schema);
// idle until both files and schema are non-null
```

Each hook owns one Worker (created lazily, terminated on unmount). Swapping inputs cancels in-flight work (latest-wins).

## Public exports

| Export | Description |
| --- | --- |
| `useExcelFile` | Parse a file → discriminated `FileState` |
| `useExcelDiff` | Parse + diff two files → `DiffState` |
| Types (`FileState`, `DiffState`, `DiffPhase`, options) | Hook contracts |
| Re-exported core types (`DiffSchema`, `Workbook`, …) | Convenience |

## Docs

Full guides: [http://localhost:3000/docs/hooks](http://localhost:3000/docs/hooks) (demo app). Deployed URL coming soon.
