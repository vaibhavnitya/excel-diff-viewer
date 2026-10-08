# Fixtures

Real xlsx and csv files used by unit tests, component tests, E2E tests, and
the demo app. Keep binary files small (< 1 MB each) unless specifically used
for large-file stress tests.

## Suggested fixtures to add during Phase 1

- `small.xlsx` — 10 rows, 5 cols, happy path
- `small.csv` — same data as CSV
- `rate-card-v1.xlsx` — origin + destination + rate
- `rate-card-v2.xlsx` — same shape, with changes to test diff
- `surcharge-v1.xlsx` / `surcharge-v2.xlsx` — area-keyed surcharges
- `large-100k.xlsx` — stress test (gitignore if huge, generate on CI)
- `edge-cases/`
  - `merged-cells.xlsx`
  - `formulas.xlsx`
  - `dates-mixed.xlsx` — serial dates, ISO, locale strings
  - `utf8-bom.csv`
  - `duplicate-keys.xlsx`
  - `empty-sheet.xlsx`
  - `wide-300-cols.xlsx`
