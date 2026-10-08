import { buildKey } from '../key/build-key.js';
import { normalizeRow } from '../normalize/normalize-row.js';
import { err, ok } from '../result.js';
import type { DiffError, DiffSchema, Result, Row, RowKey, Sheet } from '../types.js';
import { findDuplicateKeysError, type KeyedRow } from './detect-duplicate-keys.js';

export type IndexedSheet = {
  readonly headers: readonly string[];
  readonly byKey: ReadonlyMap<RowKey, { readonly row: Row; readonly dataRowIndex: number }>;
  readonly keyed: readonly KeyedRow[];
};

export function indexSheetByKey(
  sheet: Sheet,
  schema: DiffSchema,
  filename: string | undefined,
  side: 'a' | 'b',
): Result<IndexedSheet, DiffError> {
  const byKey = new Map<RowKey, { readonly row: Row; readonly dataRowIndex: number }>();
  const keyed: KeyedRow[] = [];

  for (let i = 0; i < sheet.rows.length; i += 1) {
    const raw = sheet.rows[i];
    if (raw === undefined) {
      continue;
    }
    const normalized = normalizeRow(raw, sheet.headers, schema.normalizers);
    const keyResult = buildKey(normalized, {
      headers: sheet.headers,
      schema,
      filename,
      dataRowIndex: i,
    });
    if (!keyResult.ok) {
      return keyResult;
    }
    keyed.push({ key: keyResult.value, dataRowIndex: i });
    byKey.set(keyResult.value, { row: normalized, dataRowIndex: i });
  }

  const dup = findDuplicateKeysError(keyed, side, filename);
  if (dup !== undefined) {
    return err(dup);
  }

  return ok({ headers: sheet.headers, byKey, keyed });
}
