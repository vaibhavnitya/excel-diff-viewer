# Architecture & Design Decisions

This document is the source of truth for *why* the library is built the way it is.
Refer back to it when making decisions. Keep it updated as decisions evolve.

## Problem

Users upload rate card Excel files to a Next.js app. The backend reconstructs
data but loses fidelity. We want:

1. A viewer that shows the actual uploaded file faithfully.
2. A diff viewer that correlates two files by business key (not row position).

## Three-package architecture

Published as three npm packages in one monorepo:

- **core** — zero UI deps. Parsing (SheetJS, Papa Parse), normalization,
  diff algorithm, Web Worker wrapper, schema inference. Works in Node too.
- **react** — React hooks (`useExcelFile`, `useExcelDiff`). Manages Worker
  lifecycle, cancellation, progress. No DOM styling.
- **ag-grid** — Drop-in `<ExcelViewer>` and `<ExcelDiffViewer>` components.
  Opinionated UI. AG Grid as peer dependency.

### Why split?

- **Bundle size** — not everyone needs AG Grid (~400KB gz).
- **Styling** — AG Grid themes conflict with host styles. Opt-in.
- **Flexibility** — advanced users can bring their own grid (Glide, TanStack).
- **Longevity** — core can power a server-side diff API later.

## Public API surface

**Tier 1 (99% of users):**
```tsx
import { ExcelViewer, ExcelDiffViewer } from '@your-scope/excel-diff-ag-grid';
<ExcelViewer file={file} />
<ExcelDiffViewer fileA={a} fileB={b} schema={schema} />
```

**Tier 2 (custom UIs):**
```tsx
import { useExcelFile, useExcelDiff } from '@your-scope/excel-diff-react';
```

**Tier 3 (engine access, Node use):**
```tsx
import { parseFile, diffWorkbooks, inferSchema } from '@your-scope/excel-diff-core';
```

## Diff algorithm

Key-based, not position-based:

1. Normalize each cell (trim, lowercase for strings, parse numbers, dates).
2. Build composite key from `schema.keyFields`. Optional fields that are blank
   become wildcard (`*`); still a distinct bucket from a filled value.
3. Index both files by key into `Map`s.
4. Walk the union of keys:
   - Only in A → removed
   - Only in B → added
   - Both → compare `valueFields` with numeric tolerance; modified or unchanged
5. Return a `DiffResult` with per-row status and per-field changes.

## Rendering modes

- `mode="unified"` (default) — one row per key, old/new side by side.
- `mode="split"` — two synchronized grids with ghost rows for missing keys.
- `mode="sheet"` — raw side-by-side with no diff logic.

## Performance

- **Workers**: all parsing + diff off main thread. Core owns the Worker,
  React hooks own its lifecycle.
- **Transferable objects**: file bytes transferred to Worker, not copied.
- **Dense arrays** for storage; objects materialized lazily per visible row.
- **Chunked diff** in Worker (~5k keys per chunk, progress reported between).
- **Virtualization** handled by AG Grid in the adapter package. Headless
  users must virtualize themselves (documented).
- **Lazy sheet parsing** — multi-sheet workbooks parse active sheet only.
- **Cancellation** — swapping files mid-op cancels in-flight work.

## Limits (defaults, overridable)

| Limit         | Default    | Rationale                        |
|---------------|------------|----------------------------------|
| File size     | 25 MB      | Rate cards rarely exceed this    |
| Rows          | 100,000    | Virtualization sweet spot        |
| Columns       | 100        | Beyond this, data is misdesigned |
| Total cells   | 2,000,000  | Memory / perf ceiling            |

Exceeded limits surface as typed errors with actionable messages.

## Error taxonomy

Every failure has a stable `code`:

- `FILE_TOO_LARGE`, `TOO_MANY_ROWS`, `TOO_MANY_COLUMNS`, `TOO_MANY_CELLS`
- `UNSUPPORTED_FORMAT`, `PARSE_ERROR`
- `INVALID_SCHEMA`, `DUPLICATE_KEYS`
- `WORKER_UNAVAILABLE`, `CANCELLED`

Components render default error UIs. Consumers can override via `renderError`
and log via `onError`.

## Decisions log

- **TypeScript, not JS** — consumers can be JS; the engine's correctness demands types.
- **MIT license** — maximum adoption. SheetJS Community (Apache 2.0) and Papa Parse (MIT) are compatible.
- **Peer dep for AG Grid** — don't force the dep or the version.
- **CSS variables for theming** — no CSS-in-JS runtime; easier to override.
- **Changesets for versioning** — supports independent-but-linked packages.
- **npm workspaces (not pnpm)** — simpler for contributors; `workspace:*` not used.
