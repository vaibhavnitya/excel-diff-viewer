---
"@mojro/excel-diff-ui": minor
---

Remove the silent no-op `renderers` prop from `<DiffSummary>`. Field-change aggregates are not `ColumnSummary` shapes and use a fixed layout; treatment renderers remain on `<WorkbookSummary>` and `<OverlaySummary>` only.
