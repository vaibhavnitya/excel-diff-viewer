# Development Roadmap

Build in phases. Finish each phase before starting the next.
Every phase ends with "it works end-to-end for this slice."

## Phase 0 — Scaffold (day 1)

- [ ] Monorepo structure in place
- [ ] All three packages have `package.json`, `tsconfig.json`, `tsup.config.ts`
- [ ] Demo app skeleton runs (`npm run dev` opens localhost:3000)
- [ ] CI runs lint + typecheck on PR

## Phase 1 — Core engine (week 1–2)

Goal: parse a file and diff two files from Node, with full tests.

- [ ] `parseFile` for xlsx (SheetJS) and csv (Papa Parse)
- [ ] Format detection by magic bytes + extension
- [ ] Normalizers (strings, numbers, dates, empty)
- [ ] `buildKey` with optional-field wildcards
- [ ] `diffWorkbooks` with full status + change detection
- [ ] `inferSchema` from headers
- [ ] Numeric tolerance comparison
- [ ] Duplicate key detection
- [ ] Fixture files in `/fixtures/`
- [ ] Vitest suite covers happy path + 10 edge cases
- [ ] Published API types stable

**Done when:** `npm test -w @mojro/excel-diff-core` passes against real xlsx fixtures.

## Phase 2 — Worker layer (week 3)

- [ ] Worker file with message protocol (parse, diff, cancel, progress)
- [ ] Promise-wrapped client (`createWorker`)
- [ ] Transferable ArrayBuffers in
- [ ] Chunked diff with progress events
- [ ] Cancellation on new request
- [x] Blob URL primary Worker construction (embedded source; no native `import.meta.url` path)
- [ ] Tested in Vitest browser mode

**Done when:** Worker parses a 20MB file + diffs 100k rows without blocking UI.

## Phase 3 — React hooks (week 4)

- [ ] `useExcelFile(file)` → `{ workbook, loading, error, progress }`
- [ ] `useExcelDiff(a, b, schema)` → same shape + `diff`
- [ ] Worker lifecycle managed per hook instance
- [ ] Cancellation on unmount + file change
- [ ] Error object with typed `code`
- [ ] Tested with Testing Library

**Done when:** demo app's custom-UI page works using only the hooks.

## Phase 4 — UI adapter (week 5)

- [x] `<ExcelViewer>` with sheet tabs, loading, errors
- [x] `<ExcelDiffViewer>` unified mode
- [x] Toolbar: stats, filter (show-only-changes), search
- [x] Cell highlighting via `cellClassRules`
- [x] CSS variables for theming
- [x] `classNames` prop for overrides
- [x] Default error UIs + `renderError` escape hatch
- [x] Limits prop + enforcement
- [x] Package renamed `@mojro/excel-diff-ui` (was ag-grid)
- [x] `<ExcelSplitViewer>` + CSV export (pulled into 4a)

**Done when:** demo app's main pages work with real rate card files. (Phase 4b)

## Phase 5 — Split view + polish (week 6)

- [x] Split viewer with synced scroll + ghost rows (shipped as `<ExcelSplitViewer>` in 4a)
- [ ] `mode="sheet"` for raw side-by-side
- [x] Progress bars (determinate) during parse + diff (4a)
- [ ] Keyboard nav parity with Excel basics
- [ ] Storybook with every state

## Phase 6 — Ship it

- [ ] README quickstarts for Next.js, Vite, CRA
- [ ] Demo deployed to Vercel
- [ ] Playwright E2E green
- [ ] `size-limit` budgets configured
- [ ] First release: `0.1.0` (treat as beta)
- [ ] Dogfood in your own rate card feature
- [ ] Announce after real-world usage shakes out bugs

## Phase 7a — Overlay (completed)

- [x] overlayWorkbooks + overlayWorkbooksAsync (rules + fn compose)
- [x] useExcelOverlay hook with main-thread chunking for fn
- [x] `<ExcelOverlayViewer>` + /overlay demo page
- [x] Real + synthetic fixtures
- [x] Docs under /docs/overlay/
- [x] Assisted editable schema on /overlay demo (uploads)

## Phase 7b — Analytics primitives (current)

- [ ] summarizeWorkbook, summarizeDiff, summarizeOverlay in core
- [ ] DiffResult.summary and OverlayResult.summary expanded with field-level aggregates
- [ ] useWorkbookSummary / useDiffSummary / useOverlaySummary hooks
- [ ] `<RateCardSummary>` / `<DiffSummary>` / `<OverlaySummary>` components (no chart lib)
- [ ] Summary cache ownership in react layer
- [ ] Docs under /docs/analytics/

## Phase 7c — In-grid editing + Excel export

- [ ] (previously Phase 7b in earlier roadmap)
