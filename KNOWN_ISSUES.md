## Known issues to address in Phase 6 polish

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