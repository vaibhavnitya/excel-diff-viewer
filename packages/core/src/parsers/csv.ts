import Papa from 'papaparse';
import { createDiffError } from '../errors.js';
import { err, ok } from '../result.js';
import type { DiffError, Result, Row, Sheet, Workbook } from '../types.js';
import { cellFromRaw } from './cell-from-raw.js';
import type { Parser, ParseFileOptions, ParseInput } from './parser-contract.js';

function decodeText(input: ParseInput): string {
  const bytes =
    input instanceof Uint8Array ? input : new Uint8Array(input);
  // Strip UTF-8 BOM
  let start = 0;
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    start = 3;
  }
  return new TextDecoder('utf-8').decode(bytes.subarray(start));
}

function coerceCell(raw: string | null | undefined): import('../types.js').CellValue {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  return cellFromRaw(raw);
}

export const csvParser: Parser = {
  format: 'csv',
  parse(input: ParseInput, options?: ParseFileOptions): Result<Workbook, DiffError> {
    try {
      const text = decodeText(input);
      const parsed = Papa.parse<string[]>(text, {
        header: false,
        skipEmptyLines: true,
        dynamicTyping: false,
      });

      if (parsed.errors.length > 0) {
        const first = parsed.errors[0];
        return err(
          createDiffError(
            'PARSE_ERROR',
            `File '${options?.filename ?? 'unknown.csv'}' failed to parse as csv: ${first?.message ?? 'unknown error'}`,
            {
              filename: options?.filename,
              row: first?.row,
              code: first?.code,
            },
          ),
        );
      }

      const rowsAoA = parsed.data;
      if (rowsAoA.length === 0) {
        const workbook: Workbook = {
          sheets: [{ name: 'Sheet1', headers: [], rows: [] }],
          activeSheetIndex: 0,
          meta: { format: 'csv', filename: options?.filename },
        };
        return ok(workbook);
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
        const row: import('../types.js').CellValue[] = new Array(headers.length);
        for (let c = 0; c < headers.length; c += 1) {
          row[c] = coerceCell(raw[c]);
        }
        if (row.every((v) => v === null || v === '')) {
          continue;
        }
        dataRows.push(row);
      }

      const sheet: Sheet = {
        name: 'Sheet1',
        headers,
        rows: dataRows,
      };

      return ok({
        sheets: [sheet],
        activeSheetIndex: 0,
        meta: { format: 'csv', filename: options?.filename },
      });
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : String(cause);
      return err(
        createDiffError(
          'PARSE_ERROR',
          `File '${options?.filename ?? 'unknown.csv'}' failed to parse as csv: ${message}`,
          { filename: options?.filename, cause: message },
        ),
      );
    }
  },
};
