import * as XLSX from 'xlsx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseFile } from '../../src/parsers/parse-file.js';
import type { Workbook } from '../../src/types.js';
import {
  toArrayBuffer,
  writeWorkbook,
  writeWorkbookAsync,
} from '../../src/write/write.js';
import { workbooksStructurallyEqual } from './structural-equal.js';

function wb(
  sheets: Workbook['sheets'],
  filename = 'sample.xlsx',
): Workbook {
  return {
    sheets,
    activeSheetIndex: 0,
    meta: { format: 'xlsx', filename },
  };
}

const XLSX_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // PK\x03\x04

describe('writeWorkbook', () => {
  it('writes a minimal single-sheet workbook with xlsx magic bytes', () => {
    const result = writeWorkbook(
      wb([{ name: 'Sheet1', headers: ['a', 'b'], rows: [[1, 'x']] }]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const bytes = new Uint8Array(result.value);
    expect(bytes.byteLength).toBeGreaterThan(4);
    expect([...bytes.slice(0, 4)]).toEqual(XLSX_MAGIC);
  });

  it('writes a multi-sheet workbook with all sheets', async () => {
    const result = writeWorkbook(
      wb([
        { name: 'One', headers: ['a'], rows: [[1]] },
        { name: 'Two', headers: ['b'], rows: [['hi']] },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parsed = await parseFile(result.value, { filename: 'out.xlsx' });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.sheets.map((s) => s.name)).toEqual(['One', 'Two']);
  });

  it('restricts output to options.sheets', async () => {
    const result = writeWorkbook(
      wb([
        { name: 'Keep', headers: ['a'], rows: [[1]] },
        { name: 'Drop', headers: ['b'], rows: [[2]] },
      ]),
      { sheets: ['Keep'] },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parsed = await parseFile(result.value, { filename: 'out.xlsx' });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.sheets.map((s) => s.name)).toEqual(['Keep']);
  });

  it('returns INVALID_OPTIONS for unknown sheet name', () => {
    const result = writeWorkbook(
      wb([{ name: 'Only', headers: ['a'], rows: [[1]] }]),
      { sheets: ['Missing'] },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_OPTIONS');
    expect(result.error.details?.missing).toEqual(['Missing']);
    expect(result.error.message).toContain('Missing');
  });

  it('returns INVALID_OPTIONS for empty sheets array', () => {
    const result = writeWorkbook(
      wb([{ name: 'Only', headers: ['a'], rows: [[1]] }]),
      { sheets: [] },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_OPTIONS');
  });

  it('returns INVALID_OPTIONS for empty workbook', () => {
    const result = writeWorkbook(wb([]));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_OPTIONS');
  });

  it('lands filenameHint in workbook Props.Title', () => {
    const result = writeWorkbook(
      wb([{ name: 'Sheet1', headers: ['a'], rows: [[1]] }]),
      { filenameHint: 'rates-export.xlsx' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = XLSX.read(result.value, { type: 'array' });
    expect(raw.Props?.Title).toBe('rates-export.xlsx');
  });

  it('round-trips each cell type', async () => {
    const original = wb([
      {
        name: 'Types',
        headers: ['str', 'num', 'bool', 'nil', 'blank', 'date', 'datetime'],
        rows: [
          [
            'hello',
            42.5,
            true,
            null,
            '',
            '2024-01-15',
            '2024-01-15T10:30:00.000Z',
          ],
        ],
      },
    ]);
    const written = writeWorkbook(original);
    expect(written.ok).toBe(true);
    if (!written.ok) return;
    const parsed = await parseFile(written.value, { filename: 'types.xlsx' });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(workbooksStructurallyEqual(original, parsed.value)).toBe(true);
  });

  it('round-trips special characters in headers and cells', async () => {
    const original = wb([
      {
        name: 'Special',
        headers: ['quote"me', 'comma,here', 'line\nbreak', '日本語', 'café'],
        rows: [['a"b', 'x,y', 'a\nb', '東京', 'naïve']],
      },
    ]);
    const written = writeWorkbook(original);
    expect(written.ok).toBe(true);
    if (!written.ok) return;
    const parsed = await parseFile(written.value, { filename: 'special.xlsx' });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(workbooksStructurallyEqual(original, parsed.value)).toBe(true);
  });

  it('writes empty sheet (headers, no rows) and round-trips', async () => {
    const original = wb([
      { name: 'Empty', headers: ['a', 'b'], rows: [] },
    ]);
    const written = writeWorkbook(original);
    expect(written.ok).toBe(true);
    if (!written.ok) return;
    const parsed = await parseFile(written.value, { filename: 'empty.xlsx' });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(workbooksStructurallyEqual(original, parsed.value)).toBe(true);
  });
});

describe('writeWorkbookAsync', () => {
  it('emits final (total, total) for small sync-equivalent sizes', async () => {
    const progress: Array<[number, number]> = [];
    const result = await writeWorkbookAsync(
      wb([{ name: 'S', headers: ['a'], rows: [[1], [2]] }]),
      undefined,
      {
        isCancelled: () => false,
        onProgress: (p, t) => {
          progress.push([p, t]);
        },
      },
    );
    expect(result.ok).toBe(true);
    expect(progress.at(-1)).toEqual([2, 2]);
  });

  it('stops at the next chunk boundary when cancelled', async () => {
    // Force chunking: 50k+ cells with tiny chunk size.
    const rows = Array.from({ length: 5_000 }, (_, i) => [
      i,
      i + 1,
      i + 2,
      i + 3,
      i + 4,
      i + 5,
      i + 6,
      i + 7,
      i + 8,
      i + 9,
    ]);
    // 5000 × 10 = 50_000 cells — at threshold; bump to 5001 rows.
    rows.push([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const big = wb([
      {
        name: 'Big',
        headers: ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9'],
        rows,
      },
    ]);

    let calls = 0;
    const result = await writeWorkbookAsync(big, undefined, {
      isCancelled: () => {
        calls += 1;
        return calls > 2;
      },
      onProgress: () => {},
      chunkSize: 100,
      yieldBetweenChunks: async () => {},
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CANCELLED');
  });

  it('completes when cancelled after write has started (bounded cost)', async () => {
    const small = wb([{ name: 'S', headers: ['a'], rows: [[1]] }]);
    let progressFired = false;
    const result = await writeWorkbookAsync(small, undefined, {
      isCancelled: () => progressFired,
      onProgress: () => {
        // Cancel after the final progress event that precedes write — for the
        // sync-equivalent path, progress fires then write runs; cancellation
        // mid-write is not possible, so we still complete successfully.
        progressFired = true;
      },
    });
    expect(result.ok).toBe(true);
  });

  it('chunks large workbooks and reports progress', async () => {
    const rows = Array.from({ length: 2_600 }, (_, i) => [
      i,
      `v${i}`,
      i % 2 === 0,
      null,
    ]);
    // 2600 × 20 cols ≈ 52k cells
    const headers = Array.from({ length: 20 }, (_, i) => `c${i}`);
    const wideRows = rows.map((r) => {
      const out: (string | number | boolean | null)[] = [...r];
      while (out.length < 20) out.push(out.length);
      return out;
    });
    const big = wb([{ name: 'Big', headers, rows: wideRows }]);
    const progress: Array<[number, number]> = [];
    const result = await writeWorkbookAsync(big, undefined, {
      isCancelled: () => false,
      onProgress: (p, t) => progress.push([p, t]),
      chunkSize: 500,
      yieldBetweenChunks: async () => {},
    });
    expect(result.ok).toBe(true);
    expect(progress.length).toBeGreaterThan(1);
    expect(progress.at(-1)?.[0]).toBe(progress.at(-1)?.[1]);
  });

  it('delegates to sync write when control is omitted', async () => {
    const result = await writeWorkbookAsync(
      wb([{ name: 'S', headers: ['a'], rows: [[1]] }]),
    );
    expect(result.ok).toBe(true);
  });

  it('returns INVALID_OPTIONS from async when sheets are invalid', async () => {
    const result = await writeWorkbookAsync(wb([]), undefined, {
      isCancelled: () => false,
      onProgress: () => {},
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_OPTIONS');
  });

  it('cancels on the sync-equivalent path before write', async () => {
    const result = await writeWorkbookAsync(
      wb([{ name: 'S', headers: ['a'], rows: [[1]] }]),
      undefined,
      {
        isCancelled: () => true,
        onProgress: () => {},
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CANCELLED');
  });

  it('cancels between sheets on the chunked path', async () => {
    const headers = Array.from({ length: 20 }, (_, i) => `c${i}`);
    const rows = Array.from({ length: 1_300 }, (_, i) =>
      headers.map((_, c) => i + c),
    );
    // Two sheets × 1300 × 20 = 52_000 cells — each sheet is one chunk.
    const big = wb([
      { name: 'S1', headers, rows },
      { name: 'S2', headers, rows },
    ]);
    let processedCells = 0;
    const result = await writeWorkbookAsync(big, { filenameHint: 'big.xlsx' }, {
      // Becomes true only after S1 reports progress, so the next check is at
      // the start of the S2 loop (not mid-chunk inside S1).
      isCancelled: () => processedCells > 0,
      onProgress: (p) => {
        processedCells = p;
      },
      chunkSize: 10_000,
      yieldBetweenChunks: async () => {},
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CANCELLED');
  });

  it('cancels after all rows assembled but before final write', async () => {
    const headers = Array.from({ length: 20 }, (_, i) => `c${i}`);
    const rows = Array.from({ length: 2_600 }, (_, i) =>
      headers.map((_, c) => i + c),
    );
    const big = wb([{ name: 'Big', headers, rows }]);
    let progressCount = 0;
    const result = await writeWorkbookAsync(big, undefined, {
      isCancelled: () => progressCount >= 1 && progressCount < 100,
      onProgress: () => {
        progressCount += 1;
      },
      chunkSize: 10_000,
      yieldBetweenChunks: async () => {},
    });
    // With one chunk covering all rows, cancel fires on the post-loop check
    // if isCancelled is true after the only progress event.
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CANCELLED');
  });

  it('uses defaultYield when yieldBetweenChunks is omitted', async () => {
    const headers = Array.from({ length: 20 }, (_, i) => `c${i}`);
    const rows = Array.from({ length: 2_600 }, (_, i) =>
      headers.map((_, c) => i + c),
    );
    const big = wb([{ name: 'Big', headers, rows }]);
    const result = await writeWorkbookAsync(big, undefined, {
      isCancelled: () => false,
      onProgress: () => {},
      chunkSize: 500,
      // omit yieldBetweenChunks → defaultYield
    });
    expect(result.ok).toBe(true);
  }, 15_000);

  it('pads short rows with null and ignores empty filenameHint', () => {
    const result = writeWorkbook(
      wb([{ name: 'S', headers: ['a', 'b', 'c'], rows: [['only']] }]),
      { filenameHint: '' },
    );
    expect(result.ok).toBe(true);
  });

  it('messages empty workbook without filename as unknown', () => {
    const result = writeWorkbook({
      sheets: [],
      activeSheetIndex: 0,
      meta: { format: 'xlsx' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('unknown');
  });
});

describe('toArrayBuffer', () => {
  it('copies ArrayBuffer input', () => {
    const src = new Uint8Array([1, 2, 3]).buffer;
    const out = toArrayBuffer(src);
    expect(out).not.toBe(src);
    expect([...new Uint8Array(out)]).toEqual([1, 2, 3]);
  });

  it('copies Uint8Array input', () => {
    const src = new Uint8Array([80, 75, 3, 4]);
    const out = toArrayBuffer(src);
    expect([...new Uint8Array(out)]).toEqual([80, 75, 3, 4]);
  });

  it('accepts number[] input', () => {
    const out = toArrayBuffer([80, 75, 3, 4]);
    expect([...new Uint8Array(out)]).toEqual([80, 75, 3, 4]);
  });

  it('throws on unexpected types', () => {
    expect(() => toArrayBuffer({ weird: true })).toThrow(/Unexpected SheetJS/);
  });
});

describe('writeWorkbook SheetJS edge cases', () => {
  it('returns WRITE_FAILED for duplicate sheet names', () => {
    const result = writeWorkbook(
      wb([
        { name: 'Dup', headers: ['a'], rows: [[1]] },
        { name: 'Dup', headers: ['b'], rows: [[2]] },
      ]),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('WRITE_FAILED');
  });

  it('returns WRITE_FAILED from async chunked path for duplicate sheet names', async () => {
    const headers = Array.from({ length: 20 }, (_, i) => `c${i}`);
    const rows = Array.from({ length: 1_300 }, (_, i) =>
      headers.map((_, c) => i + c),
    );
    const result = await writeWorkbookAsync(
      wb([
        { name: 'Dup', headers, rows },
        { name: 'Dup', headers, rows },
      ]),
      { filenameHint: 'hint.xlsx' },
      {
        isCancelled: () => false,
        onProgress: () => {},
        chunkSize: 10_000,
        yieldBetweenChunks: async () => {},
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('WRITE_FAILED');
  });
});

describe('writeWorkbook large-workbook warning', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it('warns in non-production when workbook has more than 50k cells', () => {
    process.env.NODE_ENV = 'development';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // 2501 × 20 = 50_020 cells
    const headers = Array.from({ length: 20 }, (_, i) => `c${i}`);
    const rows = Array.from({ length: 2_501 }, (_, i) =>
      headers.map((_, c) => i + c),
    );
    const result = writeWorkbook(wb([{ name: 'Big', headers, rows }]));
    expect(result.ok).toBe(true);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('writeWorkbook called on a large workbook'),
    );
  });

  it('does not warn at or below 50k cells', () => {
    process.env.NODE_ENV = 'development';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // 2500 × 20 = 50_000 cells — threshold is exclusive
    const headers = Array.from({ length: 20 }, (_, i) => `c${i}`);
    const rows = Array.from({ length: 2_500 }, (_, i) =>
      headers.map((_, c) => i + c),
    );
    const result = writeWorkbook(wb([{ name: 'Edge', headers, rows }]));
    expect(result.ok).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not warn in production even for large workbooks', () => {
    process.env.NODE_ENV = 'production';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const headers = Array.from({ length: 20 }, (_, i) => `c${i}`);
    const rows = Array.from({ length: 2_501 }, (_, i) =>
      headers.map((_, c) => i + c),
    );
    const result = writeWorkbook(wb([{ name: 'Big', headers, rows }]));
    expect(result.ok).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });
});
