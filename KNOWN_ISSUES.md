## Known issues (post Phase 6a / 6b)

Phases 6a (`theme` prop + CSS tokens) and 6b (MUI / Carbon / AG Grid theme
docs) are complete. Open items below are for later polish / Phase 7+ work.

### Theming / style isolation (watch)

- **CSS-only variables (not on `Theme`):** `--edv-warning-bg` / `--edv-warning-fg`,
  `--edv-ghost-opacity`, and `--edv-muted-fg` ship in `styles.css` and appear in
  the docs CSS variable tables, but have no corresponding `Theme` fields. Override
  them via CSS until/unless the type grows.
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
  Should emit a final (total, total) event unconditionally.
- Core exports should be re-audited before 1.0 — the Phase 1 cleanup
  narrowed from 29 to ~15, but any additions since need review.

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
