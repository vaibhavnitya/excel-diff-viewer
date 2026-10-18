/**
 * Baseline numbers (recorded 2026-10-18 on win32 x64, Node v20.9.0):
 *   writeWorkbook (10k × 20):       ~525ms    (enforced budget: ≤1000ms)
 *   writeWorkbook (100k × 20):      ~12600ms  (reference only; sanity ~15000ms)
 *   writeWorkbookAsync (100k × 20): ~15400ms  (reference only; same treatment)
 *
 * Status: PASS (10k budget); 100k recorded as reference.
 *
 * 10k is the regression budget for the common case. 100k is tracked for
 * 7d-polish resolution — variance below ~15000ms is noise; higher indicates
 * a real regression. SheetJS Community write spends most time in compression,
 * which cannot be chunked. Worker-side write is Phase 7d-polish.
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
