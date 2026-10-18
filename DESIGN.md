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
- **react** — React hooks (`useExcelFile`, `useExcelDiff`, `useExcelOverlay`).
  Manages Worker lifecycle, cancellation, progress. No DOM styling.
- **ui** — Drop-in `<ExcelViewer>`, `<ExcelDiffViewer>`, `<ExcelSplitViewer>`,
  and `<ExcelOverlayViewer>` components. Opinionated UI. AG Grid as peer
  dependency.

### Why split?

- **Bundle size** — not everyone needs AG Grid (~400KB gz).
- **Styling** — AG Grid themes conflict with host styles. Opt-in.
- **Flexibility** — advanced users can bring their own grid (Glide, TanStack).
- **Longevity** — core can power a server-side diff API later.

## Public API surface

**Tier 1 (99% of users):**
```tsx
import {
  ExcelViewer,
  ExcelDiffViewer,
  ExcelOverlayViewer,
  WorkbookSummary,
  DiffSummary,
  OverlaySummary,
} from '@mojro/excel-diff-ui';
import '@mojro/excel-diff-ui/styles.css';
<ExcelViewer file={file} />
<ExcelDiffViewer fileA={a} fileB={b} schema={schema} />
<ExcelOverlayViewer baseFile={base} overlayFile={overlay} options={{ schema }} />
<WorkbookSummary summary={workbookSummary} />
```

**Tier 2 (custom UIs):**
```tsx
import {
  useExcelFile,
  useExcelDiff,
  useExcelOverlay,
  useWorkbookSummary,
} from '@mojro/excel-diff-react';
```

**Tier 3 (engine access, Node use):**
```ts
import {
  parseFile,
  inferSchema,
  diffWorkbooks,
  diffWorkbooksAsync,
  overlayWorkbooks,
  overlayWorkbooksAsync,
  summarizeWorkbook,
  summarizeWorkbookAsync,
  createSummaryCache,
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

## Overlay

Join-and-combine primitive. Callers pass a base workbook, an overlay workbook,
and `OverlayWorkbooksOptions` (`{ schema, sheetName?, limits? }`):

1. Validate the schema against **exact** header names (no case folding).
2. Index the overlay sheet by join columns (normalized via the same pipeline as
   diff). With `wildcardOnEmpty: 'overlay'` (default), empty overlay join cells
   match any base value — implemented as up to `2^N` candidate-key lookups per
   base row (N is typically 2–4). Diff does not use this pattern: optional key
   blanks become distinct `*` buckets, not cross-bucket matches.
3. Compose:
   - **`rules`** — declarative ops (`add`, `percentIncrease`, `multiply`,
     `replace`, `passthrough`). Expects 0 or 1 overlay match per base row;
     2+ → `OVERLAY_AMBIGUOUS_MATCH`. Runs entirely in the Worker on dense arrays
     (column indexes resolved at validation time).
   - **`fn`** — custom `ComposeFn`. Functions cannot cross the Worker boundary,
     so the Worker returns matched pairs and the React hook runs `fn` on the
     main thread in rAF chunks, materializing `NamedRow` views per chunk only.
4. Return a derived one-sheet `Workbook` plus `OverlaySummary` as a side-output
   of the same pass (`Workbook.meta.overlay` carries the same counts plus
   capped `rowWarnings`).

Demo fixtures: synthetic simple rates + fuel (`rules`), and a real-shaped FTL
rate card + surcharge template (`fn`) — see `/overlay` and `/docs/overlay/`.

**Non-goals (Phase 7a):** rating engine semantics, cascading precedence,
pattern matching, multi-sheet output, chained rules, in-grid editing,
Excel export (7c). Analytics aggregates are engine-only in 7b-slim (see Summary).

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
  from the embedded Worker (currently ~778KB) will be addressed in a later
  phase (bundle / lazy-loaded parsers — see `KNOWN_ISSUES.md`).
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
- `INVALID_SCHEMA`, `SCHEMA_INFERENCE_FAILED`, `DUPLICATE_KEYS`,
  `OVERLAY_AMBIGUOUS_MATCH`
- `SUMMARY_INVALID_CONFIG`, `SUMMARY_COLUMN_NOT_FOUND`
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

This section is the source of truth for how theming works. Demo docs and
package READMEs should cite it rather than restate every detail.

### No bundled design systems

The UI package does **not** import or ship MUI, Carbon, Tailwind, or any other
design system. Reasons:

- Keeps `@mojro/excel-diff-ui` small and peer-dep free of host UI kits.
- Avoids version and style conflicts with the consumer’s app chrome.
- Lets each product map its own tokens once, instead of the library guessing
  a lowest-common-denominator theme API for every kit.

Consumers who want their design system reflected in the viewer pass a typed
`theme` prop. The library turns that object into `--edv-*` CSS variables on
the component root. No design-system code lives in library packages.

### Adapter pattern

Design-system-specific integration (e.g. mapping an MUI theme to our `Theme`)
belongs in **consumer** code. The demo app ships copy-paste MUI and Carbon
adapter helpers under `apps/demo/examples/` and interactive guides at
`/docs/styling/mui` and `/docs/styling/carbon`. Copy those helpers into the
app; they are not published as npm packages and must not be imported from
`@mojro/excel-diff-ui`.

### Precedence model

Precedence, lowest → highest:

1. Library defaults in `styles.css` (`:root { --edv-added-bg: … }`)
2. Dark mode overrides (`:root[data-theme='dark']`)
3. Consumer CSS targeting `--edv-*` (loaded after library CSS)
4. `theme` prop (inline CSS variables on the component root)
5. `classNames` prop (user classes; win when more specific)
6. `style` prop (merged last on the root; overrides everything)

`theme.spacing.rowHeight` / `headerHeight` also set AG Grid’s `rowHeight` /
`headerHeight` as library defaults. Explicit `agGridProps.rowHeight` /
`headerHeight` still win (Phase 5 merge policy).

Because the `theme` prop is applied as inline styles, it outranks dark-mode
CSS on `:root`. A light `theme` under a dark host page (or the reverse) can
look mismatched — prefer aligning the prop with the host mode, or leave those
tokens unset so dark-mode CSS variables apply.

### Theme interface shape

`Theme` is defined and documented in source:

`packages/ui/src/theme.ts` (exported as `Theme` from `@mojro/excel-diff-ui`).

Do not duplicate the full field list here. Every field is optional; omit what
you do not override. The interactive field ↔ CSS variable map lives at
`/docs/styling/custom`.

### When to use which lever

| Goal | Prefer |
| --- | --- |
| Change a few colors / radii globally | Consumer CSS overrides of `--edv-*` |
| Flow an app design system (MUI, Carbon, …) into the viewer | `theme` prop via a consumer adapter |
| One-off slot styling (toolbar, status cells, …) | `classNames` prop |
| Change AG Grid’s look (Quartz, Alpine, …) | `agGridProps.theme` (or AG Grid CSS) |
| Combine approaches | Stack them; respect the precedence table above |

A scannable version of this table lives at `/docs/styling/decision-guide`.

### Library chrome vs AG Grid theming

Two separate surfaces:

1. **Library chrome** — toolbar, sheet tabs, error/loading panels, diff status
   colors, key-column tint, spacing tokens. Controlled by `--edv-*`, the
   `theme` prop, `classNames`, and `style` as above.
2. **AG Grid chrome** — grid theme object / AG Grid CSS (borders, header
   chrome, filter widgets, density). Controlled by `agGridProps.theme`
   (defaults to `themeQuartz`). See `/docs/styling/ag-grid-themes` and
   `/docs/filtering-and-sorting`.

They compose: an MUI-mapped `theme` can sit beside `agGridProps.theme =
themeAlpine` without the library coupling the two.

## Overlay

Join-and-combine primitive, parallel to the keyed diff. Callers pass a base
workbook, an overlay workbook, and `OverlayWorkbooksOptions`
(`{ schema, sheetName?, limits? }`):

1. Validate `OverlaySchema` against exact header names (no case folding).
2. Index overlay rows by normalized join-column values.
3. For each base row, look up matching overlay rows:
   - `wildcardOnEmpty: 'overlay'` (default): empty overlay join cells match any
     base value. Implemented as up to `2^N` candidate-key lookups per base row
     (N = join column count; typically 2–4).
   - `wildcardOnEmpty: 'none'`: empty is literal; single hash lookup (same spirit
     as diff’s exact-key buckets).
4. Compose:
   - `rules` — declarative ops (`add`, `percentIncrease`, `multiply`, `replace`,
     `passthrough`) on dense arrays (column indexes resolved at validation).
     Expects 0 or 1 match; 2+ → `OVERLAY_AMBIGUOUS_MATCH`.
   - `fn` — custom `ComposeFn` receiving `NamedRow` views. Worker builds
     `MatchedPair[]`; React runs `fn` on the main thread (functions are not
     structured-cloneable). Node/direct `overlayWorkbooks` runs `fn` inline.

**Why wildcard-on-empty for overlay but not pattern-match in diff?** Rate-card
surcharge templates often leave a dimension blank to mean “applies to all.”
Diff compares two versions of the same card and must not silently merge
distinct keys. Overlay composes two *different* sheets where blank-means-all is
the common join pattern.

**Why `rules` in Worker / `fn` on main thread?** Worker messaging cannot carry
closures. Rules are plain data and stay off the UI thread; `fn` must execute
where the function object lives.

**Why one-to-one under `rules`?** Unambiguous arithmetic semantics. Multi-match
belongs in `fn`, where the caller decides how to reduce N overlays.

**Non-goals (Phase 7a):** rating engines, cascading/precedence, wildcard pattern
matching across values, multi-sheet output, chained rules, in-grid editing,
Excel export. Analytics aggregates shipped as engine-only in Phase 7b-slim
(see Summary below); UI in 7c.

Demo grounding: synthetic simple rates + fuel pct (`rules`), and a real-shaped
FTL rate card + surcharge template (`fn`) under `/overlay` and
`/docs/overlay/examples`.

## Summary

Analytics primitives span core (7b-slim) plus React/UI (7c-analytics-ui).

**`summarizeWorkbook` / `summarizeWorkbookAsync`** walk dense columns and return
a `WorkbookSummary` (per-column numeric / categorical / date / boolean stats,
skipped columns, capped warnings). Optional `SummaryConfig` overrides treatment,
excludes columns, sets `topN`, and picks a sheet. Optional `SummaryCache`
(`createSummaryCache`) keys on **reference identity** of workbook + config —
same structural pattern as overlay’s dense-array / cache discipline.

**Inline side-outputs (not separate functions):**

- `DiffResult.summary: DiffSummary` — row counts plus `fieldChanges` aggregates,
  accumulated inside the existing diff pass (≤ 1.1× baseline).
- `OverlayResult.summary.targetColumns` — aggregates only for columns written by
  rules or newly introduced by `fn`. Pass-through base columns are omitted so
  consumers call `summarizeWorkbook(base)` when they want those stats.

**Why side-outputs, not `summarizeDiff` / `summarizeOverlay`?** A second walk
would blow the 1.1× budget and fight PRINCIPLES.md §2 (keep the engine a pure
single-pass pipeline). Shared stats live in `packages/core/src/summary/stats.ts`
and are imported at the integration sites.

**Why no nested per-side summaries on Diff/Overlay?** Keeps the side-output
small under the perf budget. Consumers compose with `summarizeWorkbook` + cache.

**Why full-pass inference (no sampling)?** Same rationale as overlay: at the
100k-row limit a full type-check is cheap and avoids “row 1001 introduces a new
type.” Distinct counts are exact for the same reason (YAGNI on HyperLogLog).

### UI layer (Phase 7c-analytics-ui)

Same discipline as [Theming philosophy](#theming-philosophy): no chart libraries
in `@mojro/excel-diff-ui` or `@mojro/excel-diff-react` (parallel to “no design
systems in library”). Default rendering is plain CSS. Charting belongs in
consumer code via composition.

- **Three components, not one** — `<WorkbookSummary>`, `<DiffSummary>`,
  `<OverlaySummary>` have different semantics and likely renderings. A single
  collapsed `<Summary>` was rejected.
- **Only `useWorkbookSummary`** — diff/overlay summaries ride on
  `useExcelDiff` / `useExcelOverlay` result objects (`diff.summary`,
  overlay `summary`). No `useDiffSummary` / `useOverlaySummary`.
- **`renderers` prop** — per-treatment escape hatch. The library keeps the card
  frame (title + count / nullCount); the consumer fills the visualization slot.
  Not a full-card override; not per-column-name overrides in v1.
- **Cache ownership** — hook defaults to an internal `createSummaryCache()` via
  `useRef` (GC’d on unmount). Pass `options.cache` to share across hooks.

**Non-goals (engine + UI):** percentiles beyond median, outliers, correlations,
histograms as engine output, approximate distinct counts, chained summaries,
chart libraries in published packages, interactive tooltips/zoom in defaults,
group-by aggregates, editing, Excel export.

Docs: `/docs/analytics/overview`, `/docs/analytics/components`,
`/docs/analytics/hooks`, `/docs/analytics/examples`. Demo: `/analytics`.

## Decisions log

- **TypeScript, not JS** — consumers can be JS; the engine's correctness demands types.
- **MIT license** — maximum adoption. SheetJS Community (Apache 2.0) and Papa Parse (MIT) are compatible.
- **Peer dep for AG Grid** — don't force the dep or the version.
- **AG Grid-first UI (Phase 5)** — viewers are adapters; feature surface via `agGridProps`, not custom grid chrome.
- **CSS variables for theming** — no CSS-in-JS runtime; easier to override.
- **No design systems in library (Phase 6a)** — tokens via `theme` prop; adapters stay in consumer code.
- **Changesets for versioning** — supports independent-but-linked packages.
- **npm workspaces (not pnpm)** — simpler for contributors; `workspace:*` not used.
