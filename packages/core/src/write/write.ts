import * as XLSX from 'xlsx';
import { createDiffError } from '../errors.js';
import { err, ok } from '../result.js';
import type {
  CellValue,
  DiffControl,
  DiffError,
  Result,
  Row,
  Sheet,
  Workbook,
  WriteWorkbookOptions,
} from '../types.js';

/** Cell count below which `writeWorkbookAsync` runs without chunking. */
export const WRITE_SYNC_CELL_THRESHOLD = 50_000;

/** Data rows converted per yield point when chunking. */
export const WRITE_CHUNK_ROWS = 10_000;

function defaultYield(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function totalCells(sheets: readonly Sheet[]): number {
  let n = 0;
  for (const sheet of sheets) {
    n += sheet.rows.length * Math.max(sheet.headers.length, 1);
  }
  return n;
}

function rowToAoA(headers: readonly string[], row: Row): CellValue[] {
  const out: CellValue[] = new Array(headers.length);
  for (let c = 0; c < headers.length; c += 1) {
    out[c] = row[c] ?? null;
  }
  return out;
}

/**
 * Resolve which sheets to write. Validates `options.sheets` and rejects
 * empty workbooks / empty selection lists.
 */
export function resolveSheetsToWrite(
  workbook: Workbook,
  options?: WriteWorkbookOptions,
): Result<readonly Sheet[], DiffError> {
  if (workbook.sheets.length === 0) {
    return err(
      createDiffError(
        'INVALID_OPTIONS',
        `Cannot write workbook '${workbook.meta.filename ?? 'unknown'}': it has no sheets.`,
        { filename: workbook.meta.filename },
      ),
    );
  }

  if (options?.sheets !== undefined) {
    if (options.sheets.length === 0) {
      return err(
        createDiffError(
          'INVALID_OPTIONS',
          'options.sheets is an empty array. Omit sheets to write all, or pass at least one sheet name.',
          { sheets: options.sheets },
        ),
      );
    }

    const byName = new Map(workbook.sheets.map((s) => [s.name, s]));
    const selected: Sheet[] = [];
    const missing: string[] = [];
    for (const name of options.sheets) {
      const sheet = byName.get(name);
      if (sheet === undefined) {
        missing.push(name);
      } else {
        selected.push(sheet);
      }
    }
    if (missing.length > 0) {
      const available = workbook.sheets.map((s) => s.name).join(', ');
      return err(
        createDiffError(
          'INVALID_OPTIONS',
          `Sheet name(s) [${missing.join(', ')}] not found in workbook. Available: [${available}].`,
          { missing, available: workbook.sheets.map((s) => s.name) },
        ),
      );
    }
    return ok(selected);
  }

  return ok(workbook.sheets);
}

function sheetToWorksheet(sheet: Sheet): XLSX.WorkSheet {
  const aoa: CellValue[][] = [Array.from(sheet.headers)];
  for (const row of sheet.rows) {
    aoa.push(rowToAoA(sheet.headers, row));
  }
  return XLSX.utils.aoa_to_sheet(aoa);
}

/**
 * Normalize SheetJS `write` output to a standalone `ArrayBuffer`.
 * Community builds may return `ArrayBuffer`, `Uint8Array`, or `number[]`
 * for `type: 'array'` depending on version.
 * Exported for unit tests of the three return-type branches.
 */
export function toArrayBuffer(written: unknown): ArrayBuffer {
  if (written instanceof ArrayBuffer) {
    return written.slice(0);
  }
  if (written instanceof Uint8Array) {
    const copy = new Uint8Array(written.byteLength);
    copy.set(written);
    return copy.buffer;
  }
  if (Array.isArray(written)) {
    return Uint8Array.from(written as number[]).buffer;
  }
  throw new Error(
    `Unexpected SheetJS write output type: ${Object.prototype.toString.call(written)}`,
  );
}

function assembleAndWrite(
  sheets: readonly Sheet[],
  filenameHint: string | undefined,
): Result<ArrayBuffer, DiffError> {
  try {
    const wb = XLSX.utils.book_new();
    if (filenameHint !== undefined && filenameHint.length > 0) {
      wb.Props = { Title: filenameHint };
    }
    for (const sheet of sheets) {
      const worksheet = sheetToWorksheet(sheet);
      XLSX.utils.book_append_sheet(wb, worksheet, sheet.name);
    }
    const written = XLSX.write(wb, {
      type: 'array',
      bookType: 'xlsx',
      compression: true,
      cellDates: false,
    });
    return ok(toArrayBuffer(written));
  } catch (cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return err(
      createDiffError(
        'WRITE_FAILED',
        `Failed to write xlsx workbook: ${message}`,
        { cause: message },
      ),
    );
  }
}

/**
 * Serialize a `Workbook` to `.xlsx` bytes (values only — no formatting).
 *
 * Dates are written as ISO strings (matching parse-side normalization).
 * SheetJS Community does not write formulas.
 */
export function writeWorkbook(
  workbook: Workbook,
  options?: WriteWorkbookOptions,
): Result<ArrayBuffer, DiffError> {
  if (process.env.NODE_ENV !== 'production') {
    const cellCount = workbook.sheets.reduce(
      (sum, sheet) => sum + sheet.rows.length * sheet.headers.length,
      0,
    );
    if (cellCount > 50_000) {
      console.warn(
        `writeWorkbook called on a large workbook (${cellCount.toLocaleString()} cells). ` +
          `This will block the main thread for several seconds. ` +
          `Consider writeWorkbookAsync for better UX.`,
      );
    }
  }

  const resolved = resolveSheetsToWrite(workbook, options);
  if (!resolved.ok) {
    return resolved;
  }
  return assembleAndWrite(resolved.value, options?.filenameHint);
}

/**
 * Chunked, cancellable write. Progress is `(processedCells, totalCells)`.
 * Always emits a final `(total, total)` when control is provided and the
 * write is about to run (or for sync-equivalent small inputs).
 *
 * SheetJS's final `write` call is a single sync op and cannot be cancelled
 * mid-flight — cancellation is checked at chunk boundaries and immediately
 * before that call.
 */
export async function writeWorkbookAsync(
  workbook: Workbook,
  options?: WriteWorkbookOptions,
  control?: DiffControl,
): Promise<Result<ArrayBuffer, DiffError>> {
  if (control === undefined) {
    return writeWorkbook(workbook, options);
  }

  const resolved = resolveSheetsToWrite(workbook, options);
  if (!resolved.ok) {
    return resolved;
  }
  const sheets = resolved.value;
  const total = totalCells(sheets);
  const yieldBetween = control.yieldBetweenChunks ?? defaultYield;
  const chunkRows = control.chunkSize ?? WRITE_CHUNK_ROWS;

  if (total < WRITE_SYNC_CELL_THRESHOLD) {
    if (control.isCancelled()) {
      return err(
        createDiffError('CANCELLED', 'Write was cancelled before completion.', {
          processed: 0,
          total,
        }),
      );
    }
    control.onProgress(total, total);
    return assembleAndWrite(sheets, options?.filenameHint);
  }

  // Chunked path: build worksheets row-by-row with yield points, then write once.
  try {
    const wb = XLSX.utils.book_new();
    if (options?.filenameHint !== undefined && options.filenameHint.length > 0) {
      wb.Props = { Title: options.filenameHint };
    }

    let processed = 0;
    for (const sheet of sheets) {
      if (control.isCancelled()) {
        return err(
          createDiffError('CANCELLED', 'Write was cancelled before completion.', {
            processed,
            total,
          }),
        );
      }

      const aoa: CellValue[][] = [Array.from(sheet.headers)];
      let row = 0;
      const rowCount = sheet.rows.length;
      const colCount = Math.max(sheet.headers.length, 1);

      while (row < rowCount) {
        if (control.isCancelled()) {
          return err(
            createDiffError('CANCELLED', 'Write was cancelled before completion.', {
              processed,
              total,
            }),
          );
        }

        const end = Math.min(row + chunkRows, rowCount);
        for (let r = row; r < end; r += 1) {
          aoa.push(rowToAoA(sheet.headers, sheet.rows[r]!));
        }
        processed += (end - row) * colCount;
        control.onProgress(processed, total);
        row = end;
        if (row < rowCount) {
          await yieldBetween();
        }
      }

      const worksheet = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, worksheet, sheet.name);
    }

    if (control.isCancelled()) {
      return err(
        createDiffError('CANCELLED', 'Write was cancelled before completion.', {
          processed,
          total,
        }),
      );
    }

    // Final progress immediately before the uninterruptible SheetJS write.
    control.onProgress(total, total);

    const written = XLSX.write(wb, {
      type: 'array',
      bookType: 'xlsx',
      compression: true,
      cellDates: false,
    });
    return ok(toArrayBuffer(written));
  } catch (cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return err(
      createDiffError(
        'WRITE_FAILED',
        `Failed to write xlsx workbook: ${message}`,
        { cause: message },
      ),
    );
  }
}
