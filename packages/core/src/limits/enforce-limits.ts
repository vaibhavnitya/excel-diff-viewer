import { createDiffError } from '../errors.js';
import { mergeLimits } from '../defaults.js';
import { err, ok } from '../result.js';
import type { DiffError, Limits, Result, Workbook } from '../types.js';

export function inputByteLength(input: ArrayBuffer | Uint8Array): number {
  if (input instanceof ArrayBuffer) {
    return input.byteLength;
  }
  return input.byteLength;
}

export function enforceInputSize(
  byteLength: number,
  limits: Limits,
  filename?: string,
): Result<void, DiffError> {
  if (byteLength <= limits.maxFileSizeBytes) {
    return ok(undefined);
  }
  const label = filename === undefined ? 'File' : `File '${filename}'`;
  return err(
    createDiffError(
      'FILE_TOO_LARGE',
      `${label} is ${(byteLength / (1024 * 1024)).toFixed(2)} MB, which exceeds the limit of ${(limits.maxFileSizeBytes / (1024 * 1024)).toFixed(2)} MB. Split the file or raise maxFileSizeBytes.`,
      { byteLength, maxFileSizeBytes: limits.maxFileSizeBytes, filename },
    ),
  );
}

export function enforceWorkbookLimits(
  workbook: Workbook,
  limitsOverride?: Partial<Limits>,
): Result<Workbook, DiffError> {
  const limits = mergeLimits(limitsOverride);
  const filename = workbook.meta.filename;
  const label = filename === undefined ? 'Workbook' : `File '${filename}'`;

  for (const sheet of workbook.sheets) {
    const columns = sheet.headers.length;
    if (columns > limits.maxColumns) {
      return err(
        createDiffError(
          'TOO_MANY_COLUMNS',
          `${label} sheet '${sheet.name}' has ${columns} columns, which exceeds the limit of ${limits.maxColumns}. Remove unused columns or raise maxColumns.`,
          { sheet: sheet.name, columns, maxColumns: limits.maxColumns, filename },
        ),
      );
    }

    const rows = sheet.rows.length;
    if (rows > limits.maxRows) {
      return err(
        createDiffError(
          'TOO_MANY_ROWS',
          `${label} sheet '${sheet.name}' has ${rows} data rows, which exceeds the limit of ${limits.maxRows}. Filter the file or raise maxRows.`,
          { sheet: sheet.name, rows, maxRows: limits.maxRows, filename },
        ),
      );
    }

    const cells = rows * columns;
    if (cells > limits.maxCells) {
      return err(
        createDiffError(
          'TOO_MANY_CELLS',
          `${label} sheet '${sheet.name}' has ${cells} cells, which exceeds the limit of ${limits.maxCells}. Reduce rows/columns or raise maxCells.`,
          { sheet: sheet.name, cells, maxCells: limits.maxCells, filename },
        ),
      );
    }
  }

  return ok(workbook);
}
