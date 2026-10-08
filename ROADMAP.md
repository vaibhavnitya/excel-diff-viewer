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

**Done when:** `npm test -w @your-scope/excel-diff-core` passes against real xlsx fixtures.

## Phase 2 — Worker layer (week 3)

- [ ] Worker file with message protocol (parse, diff, cancel, progress)
- [ ] Promise-wrapped client (`createWorker`)
- [ ] Transferable ArrayBuffers in
- [ ] Chunked diff with progress events
- [ ] Cancellation on new request
- [ ] Blob URL fallback for environments without `import.meta.url`
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

## Phase 4 — AG Grid adapter (week 5)

- [ ] `<ExcelViewer>` with sheet tabs, loading, errors
- [ ] `<ExcelDiffViewer>` unified mode
- [ ] Toolbar: stats, filter (show-only-changes), search
- [ ] Cell highlighting via `cellClassRules`
- [ ] CSS variables for theming
- [ ] `classNames` prop for overrides
- [ ] Default error UIs + `renderError` escape hatch
- [ ] Limits prop + enforcement

**Done when:** demo app's main pages work with real rate card files.

## Phase 5 — Split view + polish (week 6)

- [ ] `mode="split"` with synced scroll + ghost rows
- [ ] `mode="sheet"` for raw side-by-side
- [ ] Progress bars (determinate) during parse + diff
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
