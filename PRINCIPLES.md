# Engineering Principles

How we write code in this repo. If `DESIGN.md` is *what* and *why*, this is
*how*. Cursor and contributors should read this before writing code and refer
back to it when reviewing.

These aren't abstract rules — each one has a concrete manifestation in this
library.

---

## 1. Separation of concerns (the three-package rule)

The three-package split exists to enforce boundaries that would otherwise
blur. Keep them clean:

- **core** must never import from `react` or any UI library. It must run in Node.
- **react** must never import from `ag-grid` or render any opinionated DOM.
- **ag-grid** is the only place AG Grid shows up.

**Test:** if you can't delete `packages/ag-grid` and still ship `core` + `react`,
something has leaked. Fix it.

---

## 2. Functional core, imperative shell

The diff engine is a **pure function pipeline**: input in, output out, no side
effects, no I/O, no clocks, no randomness. This is what makes it trivially
testable and worker-safe.

- `normalize`, `buildKey`, `diffWorkbooks`, `inferSchema` — all pure.
- Side effects (Worker messaging, file reading, state updates) live in the
  **shell**: the Worker wrapper, the React hooks, the components.

**Rule:** if a function in `core/src/diff/` or `core/src/normalize/` needs
`Date.now()`, `Math.random()`, `fetch`, or `console.log`, you're doing it wrong.
Pass those in as arguments or move the function to the shell.

---

## 3. SOLID, applied concretely

- **Single Responsibility** — one file, one job. `xlsx.ts` only parses xlsx.
  `buildKey.ts` only builds keys. If a filename needs "and" to describe it,
  split it.
- **Open/Closed** — the engine is extended via `schema.normalizers` and
  `schema.comparators`, not by editing the engine. New rate card types =
  new schema, same engine.
- **Liskov** — all `Parser` implementations (`XlsxParser`, `CsvParser`) share
  one contract. A caller using the `Parser` interface must not care which
  concrete parser runs.
- **Interface Segregation** — components take narrow, focused props. Don't
  create a god-object `config` prop; take `schema`, `limits`, `classNames`
  as separate props so consumers pay for only what they use.
- **Dependency Inversion** — `core` depends on abstractions (a `WorkerClient`
  interface), not concrete browser APIs. This is what lets `core` run in Node.

---

## 4. Dependency rule (clean architecture)

Dependencies point **inward**, never outward:

```
ag-grid  →  react  →  core
   ↓          ↓        ↓
 (deps on) (deps on) (depends on nothing in this repo)
```

- `core` imports from nothing in this repo.
- `react` imports from `core`, never from `ag-grid`.
- `ag-grid` imports from `react` and `core`.

Enforced by TypeScript project references + lint rules. If a PR adds an upward
import, CI fails.

---

## 5. Types are the specification

- Public APIs are typed first, implemented second. The types in
  `core/src/types.ts` are the contract.
- **No `any`.** Use `unknown` and narrow. If you truly need `any`, write
  a comment explaining why and `// eslint-disable-next-line`.
- **Discriminated unions for state.** Loading/error/success states are one
  union, not three booleans. Prevents impossible states like
  `{ loading: true, error: Error, data: Data }`.
- **Branded types for identifiers.** `RowKey = string & { __brand: 'RowKey' }`
  prevents accidentally passing a column name where a key is expected.
- **Readonly by default.** Mark arrays and objects `readonly` unless you
  genuinely need to mutate.

---

## 6. Error handling conventions

- **Errors are values, not control flow.** The engine returns `Result<T, E>`
  for recoverable failures (invalid schema, duplicate keys). Throw only for
  genuine programmer errors.
- **Every error has a `code`.** The `code` is stable API — consumers switch
  on it. The `message` is for humans and may change between versions.
- **Error messages are actionable.** Not "parse failed" but "File 'rates.xlsx':
  row 42 has an empty 'origin' field, which is a required key. Fix the file
  or mark 'origin' as optional in the schema."
- **No silent catches.** Every `catch` either handles the error meaningfully
  or re-throws with context.

---

## 7. Immutability and data flow

- Parsed workbooks are **frozen** before leaving the Worker (deep freeze in
  dev, shallow in prod for perf).
- Diff results are immutable. Filter/sort/search produce new views (indices
  into the base), never mutate the result.
- React state updates are always via setters with new references. No
  `state.rows.push(...)`.

---

## 8. Performance is a feature, not an optimization

Treat it as a requirement from day one, not something to fix later:

- **Measure before optimizing.** Vitest benchmarks for the diff algorithm;
  Playwright perf traces for the UI.
- **Known-size budgets** (in `size-limit` config): `core` < 80 KB gz,
  `react` < 10 KB gz on top, `ag-grid` adapter < 15 KB gz on top (excluding
  peer deps).
- **No O(n²) algorithms on cell data.** If you need one, chunk it in the Worker
  and emit progress.
- **Dense arrays over object arrays** for storage. Materialize objects lazily.
- **Transferable objects** for Worker messaging where possible.

---

## 9. Testing philosophy

- **Unit tests for pure logic** — fast, exhaustive, in `packages/*/tests/`.
  Aim for ~100% branch coverage on the engine.
- **Component tests for integration** — real DOM, real Worker (Vitest browser mode).
- **E2E for user journeys** — Playwright against the demo. One happy path, one
  error path per feature.
- **Fixtures over mocks.** Prefer a real small xlsx file in `/fixtures/` to a
  mocked SheetJS response. Mocks lie; files don't.
- **Test the contract, not the implementation.** Tests should survive a
  rewrite of the module under test.
- **Every bug fix starts with a failing test.** No exceptions.

---

## 10. API design rules

- **Smallest possible surface.** It's easier to add an API than remove one.
  When in doubt, don't export it.
- **Progressive disclosure.** Common use is one component + two props. Advanced
  use drops to hooks. Expert use touches the engine. Don't force everyone to
  learn the expert API.
- **No boolean traps.** `<ExcelDiffViewer mode="split" />`, not
  `<ExcelDiffViewer split={true} />`. Enums scale; booleans don't.
- **Named options objects** for 3+ parameters. `diffWorkbooks(a, b, { schema, limits })`
  not `diffWorkbooks(a, b, schema, limits, options, callback)`.
- **Sensible defaults.** `inferSchema` should give a working diff with zero
  config for well-named columns.
- **Backward compatibility.** After 1.0, breaking changes require a major
  version. Deprecate for one minor version before removing.

---

## 11. Naming

- **Files**: `kebab-case.ts`. One default export per file where applicable.
- **Types/Interfaces**: `PascalCase`. No `I` prefix (`User`, not `IUser`).
- **Functions/variables**: `camelCase`. Verbs for functions (`parseFile`,
  `buildKey`), nouns for data (`workbook`, `diffResult`).
- **Constants**: `SCREAMING_SNAKE_CASE` for true constants
  (`DEFAULT_MAX_ROWS`).
- **Booleans**: prefix with `is`, `has`, `can`, `should` (`isLoading`,
  `hasChanges`).
- **Private**: prefix with `_` or keep out of the barrel export. We use the latter.

---

## 12. Anti-patterns to avoid

Cursor and junior contributors tend to drift toward these. Don't:

- **God components.** `ExcelDiffViewer` must not contain parsing logic.
  Delegate to hooks.
- **Prop drilling.** If a prop goes more than two levels deep, use context —
  but **only within one package**, never cross-package.
- **Premature abstraction.** Don't add a `strategy` pattern because "we might
  need more parsers someday." Add it when you have the second parser.
- **Over-mocking in tests.** Test behavior with real files.
- **CSS-in-JS runtime.** Static CSS + CSS variables only. Keeps bundle small.
- **Default exports with implicit names.** `export default function` makes
  grep hard. Prefer named exports.
- **Mutation of inputs.** A function that mutates its arguments is a
  footgun. Return new values.
- **Workflows that only work on the author's machine.** `npm install && npm test`
  must work on a fresh clone, on CI, on Windows and Mac and Linux.

---

## 13. Commits and PRs

- **Conventional Commits.** `feat:`, `fix:`, `chore:`, `docs:`, `test:`,
  `refactor:`, `perf:`.
- **One logical change per PR.** Reviewable in under 15 minutes.
- **Changeset required** for any user-facing change. CI fails without one.
- **Every PR runs full CI.** Lint, typecheck, test, build, size-limit, E2E.

---

## 14. When in doubt

- Prefer **boring** over **clever**.
- Prefer **readable** over **concise**.
- Prefer **explicit** over **implicit**.
- Prefer **composition** over **inheritance**.
- Prefer **deletion** over **addition** — the best code is code you didn't write.
- When these conflict with each other, re-read `DESIGN.md` for the use case
  this project optimizes for, and pick accordingly.

---

## For Cursor specifically

When implementing against this codebase:

1. **Read `DESIGN.md` and this file first.** They are the specification.
2. **Follow the dependency rule** (section 4) strictly. Don't let `core` import
   from React.
3. **Write the test before the implementation** when adding new engine logic.
4. **Prefer narrow fixes.** Don't refactor adjacent code "while you're there."
5. **Ask when uncertain.** A "I notice X conflicts with principle Y, how
   should I resolve?" comment is better than silently violating Y.
