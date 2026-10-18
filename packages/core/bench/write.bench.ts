/**
 * Baseline numbers (recorded 2026-10-18 on win32 x64, Node v20.9.0):
 *   writeWorkbook (10k × 20):       ~525ms    (primary budget: ≤1000ms) PASS
 *   writeWorkbook (100k × 20):      ~12600ms  (max-size reference: ≤12000ms) BORDERLINE
 *   writeWorkbookAsync (100k × 20): ~15400ms
 *
 * Status: PASS for 10k. 100k sync sits around the 12s ceiling on this host
 * (quiet samples ~10.5s; loaded samples ~12.5–13.5s). Do not chase SheetJS
 * compression micro-opts — Worker path is 7d-polish.
 *
 * The 100k budget reflects SheetJS compression overhead at ceiling workbook size.
 * SheetJS Community write is not optimized for large files; most time is spent in
 * the compression stage, which cannot be chunked. A Worker-side write path is
 * scoped as Phase 7d-polish to keep the main thread responsive during large writes.
 *
 * Re-record after any change to the write path.
 *
 * Run: npm run bench -w @mojro/excel-diff-core
 */
import { bench, describe } from 'vitest';
import type { Workbook } from '../src/types.js';
import { writeWorkbook, writeWorkbookAsync } from '../src/write/write.js';

const COLS = 20;

function makeWorkbook(rows: number, filename: string): Workbook {
  const headers = Array.from({ length: COLS }, (_, i) => `c${i}`);
  const data = Array.from({ length: rows }, (_, r) =>
    headers.map((_, c) => (c === 0 ? r : c === 1 ? `v${r}` : r + c)),
  );
  return {
    sheets: [{ name: 'Sheet1', headers, rows: data }],
    activeSheetIndex: 0,
    meta: { format: 'xlsx', filename },
  };
}

const workbook10k = makeWorkbook(10_000, 'bench-10k.xlsx');
const workbook100k = makeWorkbook(100_000, 'bench-100k.xlsx');

describe('writeWorkbook benches', () => {
  bench(
    'writeWorkbook sync 10k×20',
    () => {
      const result = writeWorkbook(workbook10k);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
    },
    { time: 2000, iterations: 3 },
  );

  bench(
    'writeWorkbook sync 100k×20',
    () => {
      const result = writeWorkbook(workbook100k);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
    },
    { time: 1000, iterations: 1 },
  );

  bench(
    'writeWorkbookAsync 100k×20',
    async () => {
      const result = await writeWorkbookAsync(workbook100k, undefined, {
        isCancelled: () => false,
        onProgress: () => {},
        chunkSize: 10_000,
        yieldBetweenChunks: async () => {},
      });
      if (!result.ok) {
        throw new Error(result.error.message);
      }
    },
    { time: 1000, iterations: 1 },
  );
});
