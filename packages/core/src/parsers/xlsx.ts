import * as XLSX from 'xlsx';
import { createDiffError } from '../errors.js';
import { err, ok } from '../result.js';
import type { CellValue, DiffError, Result, Row, Sheet, Workbook } from '../types.js';
import { cellFromRaw } from './cell-from-raw.js';
import type { Parser, ParseFileOptions, ParseInput } from './parser-contract.js';

function toArrayBuffer(input: ParseInput): ArrayBuffer {
  if (input instanceof ArrayBuffer) {
    return input;
  }
  return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;
}

function sheetFromWorksheet(name: string, worksheet: XLSX.WorkSheet): Sheet {
  const rowsAoA = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  }) as unknown[][];

  if (rowsAoA.length === 0) {
    return { name, headers: [], rows: [] };
  }

  const headerRow = rowsAoA[0] ?? [];
  const headers = headerRow.map((cell, index) => {
    if (cell === null || cell === undefined || cell === '') {
      return `column_${index + 1}`;
    }
    return String(cell);
  });

  const dataRows: Row[] = [];
  for (let r = 1; r < rowsAoA.length; r += 1) {
    const raw = rowsAoA[r] ?? [];
    const row: CellValue[] = new Array(headers.length);
    for (let c = 0; c < headers.length; c += 1) {
      row[c] = cellFromRaw(raw[c] ?? null);
    }
    // Skip entirely empty rows
    if (row.every((v) => v === null || v === '')) {
      continue;
    }
    dataRows.push(row);
  }

  return { name, headers, rows: dataRows };
}

export const xlsxParser: Parser = {
  format: 'xlsx',
  parse(input: ParseInput, options?: ParseFileOptions): Result<Workbook, DiffError> {
    try {
      const workbookXlsx = XLSX.read(toArrayBuffer(input), {
        type: 'array',
        cellDates: true,
        dense: false,
      });

      const sheetNames = workbookXlsx.SheetNames;
      if (sheetNames.length === 0) {
        return err(
          createDiffError(
            'PARSE_ERROR',
            `File '${options?.filename ?? 'unknown.xlsx'}' contains no sheets.`,
            { filename: options?.filename },
          ),
        );
      }

      const sheets: Sheet[] = [];
      for (const name of sheetNames) {
        const worksheet = workbookXlsx.Sheets[name];
        if (worksheet === undefined) {
          continue;
        }
        sheets.push(sheetFromWorksheet(name, worksheet));
      }

      if (sheets.length === 0) {
        return err(
          createDiffError(
            'PARSE_ERROR',
            `File '${options?.filename ?? 'unknown.xlsx'}' could not be read as xlsx.`,
            { filename: options?.filename },
          ),
        );
      }

      const workbook: Workbook = {
        sheets,
        activeSheetIndex: 0,
        meta: {
          format: 'xlsx',
          filename: options?.filename,
        },
      };
      return ok(workbook);
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : String(cause);
      return err(
        createDiffError(
          'PARSE_ERROR',
          `File '${options?.filename ?? 'unknown.xlsx'}' failed to parse as xlsx: ${message}`,
          { filename: options?.filename, cause: message },
        ),
      );
    }
  },
};
