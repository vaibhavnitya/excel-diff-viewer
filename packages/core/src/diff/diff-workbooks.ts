import { resolveNumericTolerance } from '../defaults.js';
import { createDiffError } from '../errors.js';
import { enforceWorkbookLimits } from '../limits/enforce-limits.js';
import { err, ok } from '../result.js';
import type {
  DiffChange,
  DiffControl,
  DiffError,
  DiffResult,
  DiffRow,
  DiffStats,
  DiffWorkbooksOptions,
  Result,
  Row,
  RowKey,
  Sheet,
  Workbook,
} from '../types.js';
import { valuesEqual } from './compare-values.js';
import { indexSheetByKey } from './index-by-key.js';

/** Default keys processed per async chunk (DESIGN.md Performance). */
export const DEFAULT_DIFF_CHUNK_SIZE = 5000;

function pickSheet(workbook: Workbook, sheetName: string | undefined): Result<Sheet, DiffError> {
  if (sheetName !== undefined) {
    const found = workbook.sheets.find((s) => s.name === sheetName);
    if (found === undefined) {
      return err(
        createDiffError(
          'INVALID_SCHEMA',
          `Sheet '${sheetName}' was not found in file '${workbook.meta.filename ?? 'unknown'}'. Available: [${workbook.sheets.map((s) => s.name).join(', ')}].`,
          { sheetName, filename: workbook.meta.filename },
        ),
      );
    }
    return ok(found);
  }
  const active = workbook.sheets[workbook.activeSheetIndex];
  if (active === undefined) {
    return err(
      createDiffError(
        'PARSE_ERROR',
        `File '${workbook.meta.filename ?? 'unknown'}' has no active sheet.`,
        { filename: workbook.meta.filename },
      ),
    );
  }
  return ok(active);
}

function headerIndex(headers: readonly string[], name: string): number {
  const lower = name.toLowerCase();
  return headers.findIndex((h) => h.toLowerCase() === lower);
}

function collectChanges(
  rowA: Row,
  rowB: Row,
  headers: readonly string[],
  valueFields: readonly string[],
  schema: DiffWorkbooksOptions['schema'],
): DiffChange[] {
  const tolerance = resolveNumericTolerance(schema.numericTolerance);
  const changes: DiffChange[] = [];

  for (const field of valueFields) {
    const index = headerIndex(headers, field);
    if (index < 0) {
      continue;
    }
    const before = rowA[index] ?? null;
    const after = rowB[index] ?? null;
    const custom = schema.comparators?.[field];
    if (!valuesEqual(before, after, tolerance, custom)) {
      changes.push({ field, before, after });
    }
  }

  return changes;
}

function defaultYield(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

type PreparedDiff = {
  readonly headers: readonly string[];
  readonly valueFields: readonly string[];
  readonly schema: DiffWorkbooksOptions['schema'];
  readonly sortedKeys: readonly RowKey[];
  readonly byKeyA: ReadonlyMap<RowKey, { readonly row: Row }>;
  readonly byKeyB: ReadonlyMap<RowKey, { readonly row: Row }>;
};

function prepareDiff(
  a: Workbook,
  b: Workbook,
  options: DiffWorkbooksOptions,
): Result<PreparedDiff, DiffError> {
  const limitedA = enforceWorkbookLimits(a, options.limits);
  if (!limitedA.ok) {
    return limitedA;
  }
  const limitedB = enforceWorkbookLimits(b, options.limits);
  if (!limitedB.ok) {
    return limitedB;
  }

  const sheetAResult = pickSheet(a, options.sheetName);
  if (!sheetAResult.ok) {
    return sheetAResult;
  }
  const sheetBResult = pickSheet(b, options.sheetName);
  if (!sheetBResult.ok) {
    return sheetBResult;
  }

  const sheetA = sheetAResult.value;
  const sheetB = sheetBResult.value;
  const schema = options.schema;

  if (schema.keyFields.length === 0) {
    return err(
      createDiffError(
        'INVALID_SCHEMA',
        'Diff schema must include at least one keyField.',
        { schema },
      ),
    );
  }

  const indexedA = indexSheetByKey(sheetA, schema, a.meta.filename, 'a');
  if (!indexedA.ok) {
    return indexedA;
  }
  const indexedB = indexSheetByKey(sheetB, schema, b.meta.filename, 'b');
  if (!indexedB.ok) {
    return indexedB;
  }

  // Prefer headers from B (newer file) when shapes match; fall back to A.
  const headers = sheetB.headers.length > 0 ? sheetB.headers : sheetA.headers;
  const valueFields =
    schema.valueFields.length > 0
      ? schema.valueFields
      : headers.filter(
          (h) => !schema.keyFields.some((k) => k.toLowerCase() === h.toLowerCase()),
        );

  const allKeys = new Set<RowKey>([
    ...indexedA.value.byKey.keys(),
    ...indexedB.value.byKey.keys(),
  ]);

  const sortedKeys = [...allKeys].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));

  return ok({
    headers,
    valueFields,
    schema,
    sortedKeys,
    byKeyA: indexedA.value.byKey,
    byKeyB: indexedB.value.byKey,
  });
}

function processKey(
  key: RowKey,
  prepared: PreparedDiff,
  rows: DiffRow[],
  stats: { added: number; removed: number; modified: number; unchanged: number },
): void {
  const left = prepared.byKeyA.get(key);
  const right = prepared.byKeyB.get(key);

  if (left !== undefined && right === undefined) {
    rows.push({
      key,
      status: 'removed',
      changes: [],
      rowA: left.row,
      rowB: undefined,
    });
    stats.removed += 1;
    return;
  }

  if (left === undefined && right !== undefined) {
    rows.push({
      key,
      status: 'added',
      changes: [],
      rowA: undefined,
      rowB: right.row,
    });
    stats.added += 1;
    return;
  }

  if (left !== undefined && right !== undefined) {
    const changes = collectChanges(
      left.row,
      right.row,
      prepared.headers,
      prepared.valueFields,
      prepared.schema,
    );
    if (changes.length === 0) {
      rows.push({
        key,
        status: 'unchanged',
        changes: [],
        rowA: left.row,
        rowB: right.row,
      });
      stats.unchanged += 1;
    } else {
      rows.push({
        key,
        status: 'modified',
        changes,
        rowA: left.row,
        rowB: right.row,
      });
      stats.modified += 1;
    }
  }
}

function finishDiff(
  prepared: PreparedDiff,
  rows: DiffRow[],
  stats: { added: number; removed: number; modified: number; unchanged: number },
): Result<DiffResult, DiffError> {
  const resultStats: DiffStats = stats;
  return ok({
    headers: prepared.headers,
    rows,
    stats: resultStats,
  });
}

/**
 * Key-based diff of two workbooks (sync).
 * Phase 1 behavior: one pass, no progress / cancellation hooks.
 * Thin wrapper over the shared algorithm with no `DiffControl` (zero yield cost).
 *
 * @example
 * ```ts
 * import { diffWorkbooks, inferSchema, parseFile } from '@your-scope/excel-diff-core';
 *
 * const a = await parseFile(bytesA, { filename: 'v1.xlsx' });
 * const b = await parseFile(bytesB, { filename: 'v2.xlsx' });
 * if (!a.ok || !b.ok) throw new Error('parse failed');
 * const inferred = inferSchema(a.value.sheets[0].headers);
 * if (!inferred.ok) throw new Error(inferred.error.message);
 * const result = diffWorkbooks(a.value, b.value, { schema: inferred.value });
 * ```
 */
export function diffWorkbooks(
  a: Workbook,
  b: Workbook,
  options: DiffWorkbooksOptions,
): Result<DiffResult, DiffError> {
  const prepared = prepareDiff(a, b, options);
  if (!prepared.ok) {
    return prepared;
  }

  const rows: DiffRow[] = [];
  const stats = { added: 0, removed: 0, modified: 0, unchanged: 0 };
  for (const key of prepared.value.sortedKeys) {
    processKey(key, prepared.value, rows, stats);
  }
  return finishDiff(prepared.value, rows, stats);
}

/**
 * Async key-based diff with optional cooperative `DiffControl`.
 * When `control` is omitted, short-circuits to the sync path (same result as
 * `diffWorkbooks`, no microtask yield).
 *
 * `options` is {@link DiffWorkbooksOptions} (`{ schema, sheetName?, limits? }`).
 * Progress / cancellation live on the separate `control` argument (not inside
 * `options`).
 *
 * @example
 * ```ts
 * import { diffWorkbooksAsync } from '@your-scope/excel-diff-core';
 *
 * const result = await diffWorkbooksAsync(a, b, { schema }, {
 *   isCancelled: () => false,
 *   onProgress: (processed, total) => console.log(processed, total),
 *   chunkSize: 5000,
 * });
 * ```
 */
export async function diffWorkbooksAsync(
  a: Workbook,
  b: Workbook,
  options: DiffWorkbooksOptions,
  control?: DiffControl,
): Promise<Result<DiffResult, DiffError>> {
  if (control === undefined) {
    return diffWorkbooks(a, b, options);
  }

  const prepared = prepareDiff(a, b, options);
  if (!prepared.ok) {
    return prepared;
  }

  const { sortedKeys } = prepared.value;
  const total = sortedKeys.length;
  const chunkSize = control.chunkSize ?? DEFAULT_DIFF_CHUNK_SIZE;
  const yieldBetween = control.yieldBetweenChunks ?? defaultYield;

  const rows: DiffRow[] = [];
  const stats = { added: 0, removed: 0, modified: 0, unchanged: 0 };

  for (let i = 0; i < sortedKeys.length; i += chunkSize) {
    if (control.isCancelled()) {
      return err(
        createDiffError('CANCELLED', 'Diff was cancelled before completion.', {
          processed: i,
          total,
        }),
      );
    }

    const end = Math.min(i + chunkSize, sortedKeys.length);
    for (let j = i; j < end; j += 1) {
      const key = sortedKeys[j];
      if (key === undefined) {
        continue;
      }
      processKey(key, prepared.value, rows, stats);
    }

    control.onProgress(end, total);

    if (end < sortedKeys.length) {
      await yieldBetween();
    }
  }

  if (control.isCancelled()) {
    return err(
      createDiffError('CANCELLED', 'Diff was cancelled before completion.', {
        processed: total,
        total,
      }),
    );
  }

  return finishDiff(prepared.value, rows, stats);
}
