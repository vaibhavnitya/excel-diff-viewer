## Known issues (post Phase 7c-analytics-ui)

Phase 7c-analytics-ui (summary hooks + components) is complete. Phase 7b-slim
engine primitives, 7a overlay, and 6a/6b theming remain done. Open items below
are polish or Phase 7d+ work.

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
