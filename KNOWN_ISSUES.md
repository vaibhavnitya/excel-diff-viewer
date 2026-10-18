## Known issues (post Phase 7d-export)

Phase 7d-export (`writeWorkbook` + viewer XLSX downloads) is complete. Phase
7c-analytics-ui, 7b-slim, 7a overlay, and 6a/6b theming remain done. Open items
below are polish or Phase 7e+ work.

### Theming / style isolation (watch)

- **CSS-only variables (not on `Theme`):** `--edv-warning-bg` / `--edv-warning-fg`,
  `--edv-ghost-opacity`, and `--edv-muted-fg` ship in `styles.css` and appear in
  the docs CSS variable tables, but have no corresponding `Theme` fields. Override
  them via CSS until/unless the type grows.
- **New summary CSS variables not on `Theme` type:** `--edv-summary-card-bg`,
  `--edv-summary-card-border`, `--edv-summary-tile-bg`, `--edv-summary-bar-fill`,
  `--edv-summary-range-mark`, `--edv-summary-bool-true`, `--edv-summary-bool-false`.
  Same pattern as the CSS-only tokens above — override via CSS until/unless
  `Theme` grows.
- **`theme` prop vs dark mode:** the `theme` prop sets inline CSS variables and
  therefore outranks `:root[data-theme='dark']` defaults. A light token object on
  a dark host page (or the reverse) can clash — see `DESIGN.md` → Theming
  philosophy.
- **MUI demo isolation:** `/docs/styling/mui` wraps the preview in
  `ThemeProvider` + `ScopedCssBaseline` and does **not** mount global
  `CssBaseline`. Revisit if Emotion/MUI baseline still leaks into site chrome.
- **Carbon demo isolation:** `@carbon/styles/css/styles.css` is imported only
  from `/docs/styling/carbon` (not the root layout). Site nav/sidebar stay on
  shadcn/ui. Revisit if Carbon global resets affect other docs routes after
  client navigation.
- **Verified:** MUI and Carbon packages are imported only on their docs pages,
  adapters under `apps/demo/examples/`, and related unit tests — not from the
  demo root layout or library packages.

### Resolved in Phase 6a / 6b (kept for history)

- Phase 6a added (no renames): `--edv-header-weight`, `--edv-row-height`,
  `--edv-header-height`, `--edv-cell-padding`, `--edv-border-radius`. Wired into
  chrome selectors; row/header heights also thread through the `theme` prop to
  AG Grid.
- Demo MUI / Carbon / AG Grid theme integration pages and copy-paste adapters
  shipped under `/docs/styling/*` and `apps/demo/examples/`.

### Still open (engine / packaging)

- **AG Grid-locked by design (Phase 5):** the UI package is an AG Grid adapter.
  A portable grid abstraction (swap Glide / TanStack behind the same component
  API) was considered and rejected. Bring-your-own-grid remains the Tier 2 hooks
  path (`@mojro/excel-diff-react`). See `DESIGN.md` and `/docs/filtering-and-sorting`.
- Main bundle size: ~778 KB (includes embedded Worker source with SheetJS
  and Papa Parse). Mitigation: lazy-load parsers via dynamic import so
  CSV-only consumers don't pay the xlsx cost.
- `next.config.js` webpack `fs: false` fallback may no longer be needed
  after Blob URL fix. Verify and remove if unnecessary.
- Progress callbacks don't fire for single-chunk diffs (small inputs).
  Should emit a final (total, total) event unconditionally. **Overlay fixed
  this from day one** (`overlayWorkbooksAsync` always emits a final
  `(total, total)`); diff still has the bug.
- Core exports should be re-audited before 1.0 — the Phase 1 cleanup
  narrowed from 29 to ~15, but any additions since need review.
- **Worker pool deferred:** overlay introduces multi-workbook workflows
  (base + overlay). Current per-hook Worker model works but means 2–3 Workers
  active during overlay use. A pool at the react-package level is the right
  fix; deferred past 7a to keep that phase focused. Memory impact bounded by
  existing per-file limits.
- **Dev warning threshold for `fn` compose:** fixed at 1ms per call average.
  Make configurable if real users want it; not configurable in 7a.
- **`DiffError` naming:** now carries overlay and summary codes (e.g.
  `OVERLAY_AMBIGUOUS_MATCH`, `SUMMARY_*`) and is aliased as `OverlayError` /
  `SummaryError`. Rename to `EngineError` in a dedicated refactor — not in
  Phase 7b-slim.
- **`SummaryCache` not thread-safe across Workers:** in 7b-slim the cache lives
  on the main thread (or whichever thread calls summarize). If 7c introduces a
  Worker pool, cache coordination needs rethinking. Not an issue today since
  there is no cross-Worker caching.
- **No approximate distinct count:** exact counts only, bounded by workbook row
  limits. Add HLL if a real user requests it; not a priority.
- **`DiffSummary` carries no per-side workbook summaries:** consumers must call
  `summarizeWorkbook` separately on base and after workbooks if they want
  per-side stats. Deliberate — keeps the diff side-output small and under the
  1.1× budget. Documented in `/docs/analytics/overview`.
- **No per-column-name renderer overrides:** v1 `renderers` is per-treatment only
  (`numeric` / `categorical` / `date` / `boolean`). If real users want to render
  a specific column (e.g. `Unit Rate`) differently from other numeric columns,
  add later as `renderersByColumn`. Not a priority.
- **Date rendering is minimal by default:** min/max as ISO text. A real timeline
  chart requires a chart library and lives in the escape hatch. Documented in
  `/docs/analytics/components`.
- **No DiffSummary field-change renderer:** `<DiffSummary>` does not accept
  `renderers` — field-change cards (`FieldChangeAggregate`) are a different
  shape from column treatments. If real users want to customize those cards,
  that needs a separate API (e.g. `renderFieldChange: (agg: FieldChangeAggregate) => ReactNode`).
  Out of scope until requested.
- **No formatting fidelity on export:** column widths, cell colors, number
  formats, and cell styles are not preserved through write. Formatting-preserving
  export would need parse-side capture plus write-side serialize — a dedicated
  phase. Not planned.
- **No cell highlighting in diff export:** the **Edit Status** column carries
  status. Styled cell writes are supported by SheetJS Community but deliberately
  avoided for now.
- **SheetJS Community write limitations acknowledged:** no formulas, pivot
  tables, charts, images, or named ranges in exported files. Sufficient for
  value-based rate card data.
- **Round-trip tested within the library’s own parse/write cycle, not against
  arbitrary external xlsx files.** A file produced by Excel that uses features
  our parser doesn’t preserve will not round-trip through write — that is a
  parse-side limitation.
- **All-null / all-blank rows are dropped on re-parse:** the xlsx parser skips
  rows where every cell is `null` or `''` (pre-existing). Mixed blank/null cells
  in otherwise non-empty rows round-trip correctly.
### Write performance at maximum workbook size

`writeWorkbook` on 100k rows × 20 columns takes ~10–13 seconds due to SheetJS
compression overhead at ceiling size (host-load sensitive; quiet samples ~10.5s).
Smaller workbooks (10k rows) complete in well under 1 second (~0.5s). For large
workbooks, consumers should prefer `writeWorkbookAsync` and surface a loading
state on their export affordance.

Measured write time at ceiling varies 10-15 seconds depending on system load. The 10k-row common case (~500ms) is enforced as a regression budget; the 100k case is tracked as a reference only, with 7d-polish scoped to resolve the underlying blocking-write issue.

A dedicated phase (7d-polish, planned before 7e-editing) will move write
execution into a Web Worker, keeping the main thread responsive during
large writes. This is the write-side equivalent of the parse Worker that
landed in Phase 2.

A dev-mode `console.warn` fires when `writeWorkbook` (sync) is called on
workbooks larger than 50k cells, suggesting the async variant.

## Lessons from Phase 4c (docs)

- Demo smoke pages lived under `apps/demo/app/dev/` (not `_dev/`). Deleted
  after docs landed; clear `apps/demo/.next` if typecheck still references
  removed routes.
- UI components accept `File | ArrayBuffer | null`, not in-memory
  `Workbook`s — docs demos convert sample workbooks to CSV `File`s.
- Some error codes (`WORKER_*`, `CANCELLED`, `SCHEMA_INFERENCE_FAILED`)
  are awkward to force in an embedded demo; document them with copy plus a
  happy-path viewer instead of fake throws.
- Pin `@next/mdx` to the same major as `next` (14.x here); npm may otherwise
  resolve a newer major.
