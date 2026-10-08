import { resolveNumericTolerance } from '../defaults.js';
import { createDiffError } from '../errors.js';
import { enforceWorkbookLimits } from '../limits/enforce-limits.js';
import { err, ok } from '../result.js';
import type {
  DiffChange,
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

/**
 * Key-based diff of two workbooks. Pure aside from reading inputs (no I/O).
 */
export function diffWorkbooks(
  a: Workbook,
  b: Workbook,
  options: DiffWorkbooksOptions,
): Result<DiffResult, DiffError> {
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
  const rows: DiffRow[] = [];
  const stats: { added: number; removed: number; modified: number; unchanged: number } = {
    added: 0,
    removed: 0,
    modified: 0,
    unchanged: 0,
  };

  for (const key of sortedKeys) {
    const left = indexedA.value.byKey.get(key);
    const right = indexedB.value.byKey.get(key);

    if (left !== undefined && right === undefined) {
      rows.push({
        key,
        status: 'removed',
        changes: [],
        rowA: left.row,
        rowB: undefined,
      });
      stats.removed += 1;
      continue;
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
      continue;
    }

    if (left !== undefined && right !== undefined) {
      const changes = collectChanges(left.row, right.row, headers, valueFields, schema);
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

  const resultStats: DiffStats = stats;
  return ok({
    headers,
    rows,
    stats: resultStats,
  });
}
