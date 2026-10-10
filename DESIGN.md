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
- **ui** — Drop-in `<ExcelViewer>`, `<ExcelDiffViewer>`, and
  `<ExcelSplitViewer>` components. Opinionated UI. AG Grid as peer dependency.

### Why split?

- **Bundle size** — not everyone needs AG Grid (~400KB gz).
- **Styling** — AG Grid themes conflict with host styles. Opt-in.
- **Flexibility** — advanced users can bring their own grid (Glide, TanStack).
- **Longevity** — core can power a server-side diff API later.

## Public API surface

**Tier 1 (99% of users):**
```tsx
import { ExcelViewer, ExcelDiffViewer } from '@mojro/excel-diff-ui';
import '@mojro/excel-diff-ui/styles.css';
<ExcelViewer file={file} />
<ExcelDiffViewer fileA={a} fileB={b} schema={schema} />
```

**Tier 2 (custom UIs):**
```tsx
import { useExcelFile, useExcelDiff } from '@mojro/excel-diff-react';
```

**Tier 3 (engine access, Node use):**
```ts
import {
  parseFile,
  inferSchema,
  diffWorkbooks,
  diffWorkbooksAsync,
  createWorker,
} from '@mojro/excel-diff-core';

const a = await parseFile(bytesA, { filename: 'v1.xlsx' });
const b = await parseFile(bytesB, { filename: 'v2.xlsx' });
const inferred = inferSchema(a.value.sheets[0].headers);
// Diff takes DiffWorkbooksOptions — not a bare DiffSchema:
//   { schema, sheetName?, limits? }
const sync = diffWorkbooks(a.value, b.value, { schema: inferred.value });
// Async adds an optional DiffControl as the fourth argument (not inside options):
const asyncResult = await diffWorkbooksAsync(a.value, b.value, { schema: inferred.value }, {
  isCancelled: () => false,
  onProgress: (processed, total) => {},
});
```

## Diff algorithm

Key-based, not position-based. Callers pass workbooks plus
`DiffWorkbooksOptions` (`{ schema, sheetName?, limits? }`):

1. Normalize each cell (trim, lowercase for strings, parse numbers, dates).
2. Build composite key from `options.schema.keyFields`. Optional fields that
   are blank become wildcard (`*`); still a distinct bucket from a filled value.
3. Index both files by key into `Map`s.
4. Walk the union of keys:
   - Only in A → removed
   - Only in B → added
   - Both → compare `valueFields` with numeric tolerance; modified or unchanged
5. Return a `DiffResult` with per-row status and per-field changes.

`diffWorkbooksAsync` uses the same options object; cooperative chunking /
progress / cancellation use a separate `DiffControl` argument.

**Wildcard matching (Phase 1):** keys are compared by **exact string equality**
after both sides normalize blank optional key fields to `*`. A blank optional
origin and a filled origin are different buckets (wildcard rule vs specific
rule) and may coexist in the same rate card. Pattern matching (`*` matches any
value on the other side) is explicitly out of scope — it creates ambiguity
about which rule a row matches. If “find specific rules shadowed by a
wildcard” is needed later, it will be a separate analysis layer on top of the
raw diff, not part of key equality.

## Normalization

Cell values in a `Workbook` are `string | number | boolean | null` only.
`Date` is never stored (mutable, unintuitive equality, poor JSON / Worker
round-trips).

**Date canonicalization at the parse boundary:** SheetJS `Date` objects, Excel
date serial numbers, and recognizable date/datetime strings are converted to
ISO 8601 strings before they leave the parser:

- Date only → `'2024-01-15'`
- Datetime → `'2024-01-15T10:30:00.000Z'`

`normalize-date.ts` owns this conversion. ISO strings compare with `===`,
sort lexicographically in chronological order for the canonical forms above,
and can be parsed back to `Date` on demand in UI layers.

**Numeric comparison** uses absolute and relative tolerance:
`|a - b| <= max(absolute, relative * max(|a|, |b|))` with defaults
`absolute: 1e-6`, `relative: 1e-9`. A bare number in the schema sets absolute
only.

## Rendering modes

- `mode="unified"` (default) — one row per key, old/new side by side.
- `mode="split"` — two synchronized grids with ghost rows for missing keys.
- `mode="sheet"` — raw side-by-side with no diff logic.

## Performance

- **Workers**: all parsing + diff off main thread. Core owns the Worker,
  React hooks own its lifecycle. Construction uses a **Blob URL** as the
  primary (and only) path: the Worker bundle is embedded in the main package
  entry and revived with `URL.createObjectURL(new Blob([...], { type:
  'application/javascript' }))`. This works universally across bundlers
  (Next.js, Vite, CRA, Remix, plain HTML). Native `import.meta.url` Worker
  URLs are intentionally not used — they are bundler-dependent and commonly
  resolve to unusable `file://` URLs (e.g. inside Next.js). Main-bundle size
  from the embedded Worker (currently ~778KB) will be addressed in Phase 6
  via lazy-loaded parsers.
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
- `INVALID_SCHEMA`, `SCHEMA_INFERENCE_FAILED`, `DUPLICATE_KEYS`
- `WORKER_UNAVAILABLE`, `CANCELLED`

Components render default error UIs. Consumers can override via `renderError`
and log via `onError`.

## Viewers are AG Grid adapters (Phase 5)

`<ExcelViewer>`, `<ExcelDiffViewer>`, and `<ExcelSplitViewer>` are adapters —
not a portable grid framework. Each component:

1. Transforms parsed `Workbook` / `DiffResult` data into AG Grid’s required shape
2. Applies library-owned presentation (diff status coloring, key columns, split
   ghost rows, scroll sync)
3. Renders `<AgGridReact>`

Consumers who want AG Grid features (filtering, sorting, pinning, grouping,
sidebars, pagination, editing) pass them through `agGridProps`, which is merged
**after** library defaults and **before** library-locked props.

The library does **not** build custom filter / search / sort UIs that duplicate
AG Grid. Toolbar affordances that remain (`showOnlyChanges`, CSV download, and
the optional diff `searchQuery`) are product-level controls over which rows enter
the grid, not replacements for column filters.

Users who need a different grid (Glide, TanStack Table, etc.) use hooks from
`@mojro/excel-diff-react` and build their own component. A portable grid
abstraction was considered and rejected — it would either be a thin lie over AG
Grid or an underpowered lowest-common-denominator API.

**Locked vs user-wins** (summary; full table in `/docs/filtering-and-sorting`):

- Always locked: `rowData`, `getRowId`
- Diff / split locked: `columnDefs`, `getRowClass` (status / ghost)
- ExcelViewer: `columnDefs` are user-replaceable
- `defaultColDef` is deep-merged (user keys win); theme defaults to `themeQuartz`

## Theming philosophy

The UI package does **not** bundle design systems (MUI, Carbon, Tailwind, etc.).
Consumers who want their design system reflected in the viewer pass a typed
`theme` prop containing design tokens. The library translates that object into
`--edv-*` CSS variables on the component root. No design-system code is
imported in library packages.

Design-system-specific integration (e.g. mapping an MUI theme to our `Theme`)
lives in **consumer** code. The demo app may ship example adapter helpers that
consumers copy — not import from `@mojro/excel-diff-ui`.

**Precedence (lowest → highest):**

1. Library defaults in `styles.css` (`:root { --edv-added-bg: … }`)
2. Dark mode overrides (`:root[data-theme='dark']`)
3. Consumer CSS targeting `--edv-*` (loaded after library CSS)
4. `theme` prop (inline style on component root)
5. `classNames` prop (user classes; win when more specific)
6. `style` prop (merged last on the root; overrides everything)

`theme.spacing.rowHeight` / `headerHeight` also set AG Grid’s `rowHeight` /
`headerHeight` as library defaults. Explicit `agGridProps.rowHeight` still
wins (Phase 5 merge policy).

## Decisions log

- **TypeScript, not JS** — consumers can be JS; the engine's correctness demands types.
- **MIT license** — maximum adoption. SheetJS Community (Apache 2.0) and Papa Parse (MIT) are compatible.
- **Peer dep for AG Grid** — don't force the dep or the version.
- **AG Grid-first UI (Phase 5)** — viewers are adapters; feature surface via `agGridProps`, not custom grid chrome.
- **CSS variables for theming** — no CSS-in-JS runtime; easier to override.
- **No design systems in library (Phase 6a)** — tokens via `theme` prop; adapters stay in consumer code.
- **Changesets for versioning** — supports independent-but-linked packages.
- **npm workspaces (not pnpm)** — simpler for contributors; `workspace:*` not used.
