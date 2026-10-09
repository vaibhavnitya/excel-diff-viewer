# @your-scope/excel-diff-core

Framework-agnostic Excel and CSV parsing and diff engine. Runs in Node and the browser.

Depends on nothing else in this repo. React hooks live in `@your-scope/excel-diff-react`.

## Quick start

```ts
import {
  parseFile,
  inferSchema,
  diffWorkbooks,
  diffWorkbooksAsync,
  createWorker,
} from '@your-scope/excel-diff-core';

const a = await parseFile(bytesA, { filename: 'v1.xlsx' });
const b = await parseFile(bytesB, { filename: 'v2.xlsx' });
if (!a.ok || !b.ok) throw new Error('parse failed');

const inferred = inferSchema(a.value.sheets[0].headers);
if (!inferred.ok) throw new Error(inferred.error.message);

// Sync: options is DiffWorkbooksOptions — { schema, sheetName?, limits? }
const sync = diffWorkbooks(a.value, b.value, { schema: inferred.value });

// Async: same options object; DiffControl is a separate fourth argument
const asyncResult = await diffWorkbooksAsync(a.value, b.value, { schema: inferred.value }, {
  isCancelled: () => false,
  onProgress: (processed, total) => console.log(processed / total),
});

// Browser Worker (latest-wins on a single client)
const client = createWorker();
const wa = await client.parse(bytesA, { filename: 'v1.xlsx' });
const wb = await client.parse(bytesB, { filename: 'v2.xlsx' });
if (wa.ok && wb.ok && inferred.ok) {
  await client.diff(wa.value, wb.value, inferred.value);
}
client.terminate();
```
