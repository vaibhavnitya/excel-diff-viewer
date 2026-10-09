## Known issues to address in Phase 6 polish

- Main bundle size: ~778 KB (includes embedded Worker source with SheetJS 
  and Papa Parse). Mitigation: lazy-load parsers via dynamic import so 
  CSV-only consumers don't pay the xlsx cost.
- `next.config.js` webpack `fs: false` fallback may no longer be needed 
  after Blob URL fix. Verify and remove if unnecessary.
- Progress callbacks don't fire for single-chunk diffs (small inputs). 
  Should emit a final (total, total) event unconditionally.
- Core exports should be re-audited before 1.0 — the Phase 1 cleanup 
  narrowed from 29 to ~15, but any additions since need review.