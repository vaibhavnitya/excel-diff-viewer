import { createDiffError } from '../errors.js';
import { isBlank } from '../normalize/normalize-empty.js';
import { err, ok } from '../result.js';
import type {
  DiffError,
  DiffSchema,
  InvalidSchemaErrorDetails,
  Result,
  Row,
  RowKey,
} from '../types.js';

function headerIndex(headers: readonly string[], name: string): number {
  const lower = name.toLowerCase();
  return headers.findIndex((h) => h.toLowerCase() === lower);
}

function cellAsKeySegment(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return String(value);
}

export type BuildKeyContext = {
  readonly headers: readonly string[];
  readonly schema: DiffSchema;
  readonly filename?: string;
  /** 0-based index into data rows; file row number is index + 2 (header = 1). */
  readonly dataRowIndex: number;
};

/**
 * Build a composite `RowKey` from normalized row values.
 * Blank optional key fields become `*`. Blank required key fields → INVALID_SCHEMA.
 */
export function buildKey(row: Row, ctx: BuildKeyContext): Result<RowKey, DiffError> {
  const optional = new Set(
    (ctx.schema.optionalKeyFields ?? []).map((f) => f.toLowerCase()),
  );
  const segments: string[] = [];

  for (const field of ctx.schema.keyFields) {
    const index = headerIndex(ctx.headers, field);
    if (index < 0) {
      return err(
        createDiffError(
          'INVALID_SCHEMA',
          `Schema key field '${field}' was not found in the sheet headers [${ctx.headers.join(', ')}]. Fix the schema or the file headers.`,
          { field, headers: ctx.headers, filename: ctx.filename },
        ),
      );
    }

    const raw = row[index] ?? null;
    if (isBlank(raw)) {
      if (optional.has(field.toLowerCase())) {
        segments.push('*');
        continue;
      }
      const rowNumber = ctx.dataRowIndex + 2; // header row = 1
      const filename = ctx.filename;
      const fileLabel = filename === undefined ? 'File' : `File '${filename}'`;
      const details: InvalidSchemaErrorDetails = {
        filename,
        rowNumber,
        field,
      };
      return err(
        createDiffError(
          'INVALID_SCHEMA',
          `${fileLabel}: row ${rowNumber} has blank '${field}' field, which is a required key. Fix the file or mark '${field}' as optional in the schema.`,
          details,
        ),
      );
    }

    segments.push(cellAsKeySegment(raw));
  }

  return ok(segments.join('|') as RowKey);
}
