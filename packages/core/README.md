# @mojro/excel-diff-core

Framework-agnostic Excel and CSV parsing and diff engine. Runs in Node and the browser.

Depends on nothing else in this repo. React hooks live in `@mojro/excel-diff-react`. Drop-in components live in `@mojro/excel-diff-ui`.

## Install

```bash
npm install @mojro/excel-diff-core
```

## Minimal usage

```ts
import {
  parseFile,
  inferSchema,
  diffWorkbooks,
} from '@mojro/excel-diff-core';

const a = await parseFile(bytesA, { filename: 'v1.xlsx' });
const b = await parseFile(bytesB, { filename: 'v2.xlsx' });
if (!a.ok || !b.ok) throw new Error('parse failed');

const inferred = inferSchema(a.value.sheets[0].headers);
if (!inferred.ok) throw new Error(inferred.error.message);

const result = diffWorkbooks(a.value, b.value, { schema: inferred.value });
```

## Public exports

| Export | Description |
| --- | --- |
| `parseFile` | Parse xlsx / xls / csv bytes into a `Workbook` |
| `inferSchema` | Infer `DiffSchema` from headers |
| `diffWorkbooks` | Sync key-based diff |
| `diffWorkbooksAsync` | Chunked async diff with progress / cancel |
| `createWorker` / `WorkerClient` | Browser Worker client (Blob URL) |
| `createDiffError` | Build a typed `DiffError` |
| `ok` / `err` / `isOk` / `isErr` | `Result` helpers |
| `DEFAULT_LIMITS` / `DEFAULT_NUMERIC_TOLERANCE` / `DEFAULT_KEY_CANDIDATES` | Defaults |
| Types (`Workbook`, `DiffSchema`, `DiffResult`, `DiffError`, …) | Public contracts |

## Docs

Full guides: [http://localhost:3000/docs](http://localhost:3000/docs) (demo app). Deployed URL coming soon.
