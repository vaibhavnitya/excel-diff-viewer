# Fixtures

Real xlsx and csv files used by unit tests, component tests, E2E tests, and
the demo app. Keep binary files small (< 1 MB each) unless specifically used
for large-file stress tests.

## Regenerate

```bash
npm run generate:fixtures -w @your-scope/excel-diff-core
```

Source of truth: `fixtures/generate.ts`.

## Phase 1 fixtures

- `small.xlsx` / `small.csv` — 10 rows, 5 cols, happy path
- `rate-card-v1.xlsx` / `rate-card-v2.xlsx` — origin + destination + rates;
  v2 has 2 modified, 1 added, 1 removed, and a wildcard-origin (`*|eu`) modify
- `edge-cases/duplicate-keys.xlsx` — same origin+destination twice
- `edge-cases/empty-fields.xlsx` — blanks in optional / required columns
