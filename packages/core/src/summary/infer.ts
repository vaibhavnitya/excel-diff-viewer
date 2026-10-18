/**
 * Column treatment inference from dense cell arrays.
 *
 * Full pass (no sampling): workbooks are capped at 100k rows (DESIGN.md), so a
 * complete type-check is cheap and avoids the "row 1001 introduces a new type"
 * bug. Same discipline as overlay — correctness over approximate early exits.
 */
import type { CellValue, ColumnTreatment, SummaryWarning } from '../types.js';
import { pushWarning } from './stats.js';

/** Canonical ISO date / datetime forms produced by the parser (DESIGN.md). */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const DATETIME_OFFSET =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})$/;

export function isIsoDateString(value: string): boolean {
  return (
    DATE_ONLY.test(value) ||
    DATETIME_Z.test(value) ||
    DATETIME_OFFSET.test(value)
  );
}

export type CellKind = 'null' | 'number' | 'boolean' | 'isoDate' | 'string';

export function classifyCell(value: CellValue): CellKind {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'number') {
    return 'number';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  // string
  if (isIsoDateString(value)) {
    return 'isoDate';
  }
  return 'string';
}

export type InferenceResult =
  | { readonly kind: 'treatment'; readonly treatment: ColumnTreatment; readonly fellBack: boolean }
  | { readonly kind: 'all-null' };

/**
 * Infer treatment from a dense column (one value per row).
 * Mixed non-null kinds → categorical with fellBack=true.
 */
export function inferTreatment(columnValues: readonly CellValue[]): InferenceResult {
  let sawNumber = false;
  let sawBoolean = false;
  let sawIsoDate = false;
  let sawString = false;
  let nonNull = 0;

  for (let i = 0; i < columnValues.length; i += 1) {
    const kind = classifyCell(columnValues[i] ?? null);
    if (kind === 'null') {
      continue;
    }
    nonNull += 1;
    switch (kind) {
      case 'number':
        sawNumber = true;
        break;
      case 'boolean':
        sawBoolean = true;
        break;
      case 'isoDate':
        sawIsoDate = true;
        break;
      case 'string':
        sawString = true;
        break;
    }
  }

  if (nonNull === 0) {
    return { kind: 'all-null' };
  }

  const kindCount =
    (sawNumber ? 1 : 0) +
    (sawBoolean ? 1 : 0) +
    (sawIsoDate ? 1 : 0) +
    (sawString ? 1 : 0);

  if (kindCount > 1) {
    return { kind: 'treatment', treatment: 'categorical', fellBack: true };
  }

  if (sawBoolean) {
    return { kind: 'treatment', treatment: 'boolean', fellBack: false };
  }
  if (sawNumber) {
    return { kind: 'treatment', treatment: 'numeric', fellBack: false };
  }
  if (sawIsoDate) {
    return { kind: 'treatment', treatment: 'date', fellBack: false };
  }
  // sawString only
  return { kind: 'treatment', treatment: 'categorical', fellBack: false };
}

/**
 * Infer from a sheet column by index without copying the column first.
 */
export function inferTreatmentFromSheetColumn(
  rows: readonly (readonly CellValue[])[],
  columnIndex: number,
): InferenceResult {
  let sawNumber = false;
  let sawBoolean = false;
  let sawIsoDate = false;
  let sawString = false;
  let nonNull = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const kind = classifyCell(rows[i]![columnIndex] ?? null);
    if (kind === 'null') {
      continue;
    }
    nonNull += 1;
    switch (kind) {
      case 'number':
        sawNumber = true;
        break;
      case 'boolean':
        sawBoolean = true;
        break;
      case 'isoDate':
        sawIsoDate = true;
        break;
      case 'string':
        sawString = true;
        break;
    }
  }

  if (nonNull === 0) {
    return { kind: 'all-null' };
  }

  const kindCount =
    (sawNumber ? 1 : 0) +
    (sawBoolean ? 1 : 0) +
    (sawIsoDate ? 1 : 0) +
    (sawString ? 1 : 0);

  if (kindCount > 1) {
    return { kind: 'treatment', treatment: 'categorical', fellBack: true };
  }

  if (sawBoolean) {
    return { kind: 'treatment', treatment: 'boolean', fellBack: false };
  }
  if (sawNumber) {
    return { kind: 'treatment', treatment: 'numeric', fellBack: false };
  }
  if (sawIsoDate) {
    return { kind: 'treatment', treatment: 'date', fellBack: false };
  }
  return { kind: 'treatment', treatment: 'categorical', fellBack: false };
}

export function noteInferenceFallback(
  column: string,
  warnings: SummaryWarning[],
): void {
  pushWarning(warnings, {
    code: 'INFERENCE_FELL_BACK',
    column,
    message: `Column '${column}' has mixed cell types; treating as categorical.`,
  });
}
