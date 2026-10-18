---
"@mojro/excel-diff-core": minor
"@mojro/excel-diff-react": patch
"@mojro/excel-diff-ui": patch
---

Add summary primitives: `summarizeWorkbook` / `summarizeWorkbookAsync` / `createSummaryCache`, expand `DiffResult.summary` with field-level change aggregates, and expand `OverlaySummary` with derived `targetColumns` (engine-only; UI in 7c).
