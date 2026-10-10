import type { CellValue, Row } from '@mojro/excel-diff-core';

export type DetectedColumnType = 'number' | 'date' | 'text';

/** Canonical ISO forms produced by Phase 1 parse normalization. */
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

const SAMPLE_LIMIT = 100;

function isIsoDateString(value: string): boolean {
  return ISO_DATE_ONLY.test(value) || ISO_DATETIME_Z.test(value);
}

/**
 * Infer AG Grid filter type from raw cell values (before display formatting).
 * Samples the first 100 non-null values.
 */
export function detectColumnType(values: readonly CellValue[]): DetectedColumnType {
  const sample: CellValue[] = [];
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }
    sample.push(value);
    if (sample.length >= SAMPLE_LIMIT) {
      break;
    }
  }

  if (sample.length === 0) {
    return 'text';
  }

  if (sample.every((v) => typeof v === 'number' && Number.isFinite(v))) {
    return 'number';
  }

  if (sample.every((v) => typeof v === 'string' && isIsoDateString(v))) {
    return 'date';
  }

  return 'text';
}

/** Collect non-null values for a column index from dense rows. */
export function collectColumnValues(
  rows: readonly Row[],
  columnIndex: number,
): CellValue[] {
  const values: CellValue[] = [];
  for (const row of rows) {
    const value = row[columnIndex];
    if (value !== null && value !== undefined) {
      values.push(value);
    }
    if (values.length >= SAMPLE_LIMIT) {
      break;
    }
  }
  return values;
}

export function agFilterForColumnType(type: DetectedColumnType): string {
  switch (type) {
    case 'number':
      return 'agNumberColumnFilter';
    case 'date':
      return 'agDateColumnFilter';
    default:
      return 'agTextColumnFilter';
  }
}
