/**
 * Pure accumulators for per-column summary stats.
 * Shared by `summarizeWorkbook` and overlay/diff side-outputs.
 */
import type {
  BooleanColumnSummary,
  CategoricalColumnSummary,
  CellValue,
  ColumnSummary,
  ColumnTreatment,
  DateColumnSummary,
  NumericColumnSummary,
  SummaryWarning,
} from '../types.js';

export const DEFAULT_TOP_N = 10;
export const MAX_SUMMARY_WARNINGS = 100;

/** Push a warning if under the cap. */
export function pushWarning(
  warnings: SummaryWarning[],
  warning: SummaryWarning,
): void {
  if (warnings.length < MAX_SUMMARY_WARNINGS) {
    warnings.push(warning);
  }
}

// ---------------------------------------------------------------------------
// Numeric
// ---------------------------------------------------------------------------

export type NumericAccumulator = {
  readonly treatment: 'numeric';
  count: number;
  nullCount: number;
  sum: number;
  min: number;
  max: number;
  /** Collected non-null values (for median + stddev + distinct). */
  readonly values: number[];
  mixedNonNumeric: number;
};

export function createNumericAccumulator(): NumericAccumulator {
  return {
    treatment: 'numeric',
    count: 0,
    nullCount: 0,
    sum: 0,
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY,
    values: [],
    mixedNonNumeric: 0,
  };
}

export function observeNumeric(acc: NumericAccumulator, value: CellValue): void {
  if (value === null) {
    acc.nullCount += 1;
    return;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    acc.count += 1;
    acc.sum += value;
    if (value < acc.min) {
      acc.min = value;
    }
    if (value > acc.max) {
      acc.max = value;
    }
    acc.values.push(value);
    return;
  }
  acc.mixedNonNumeric += 1;
  // Forced numeric on non-numeric: count as null-equivalent for stats.
  acc.nullCount += 1;
}

function medianOfSorted(sorted: readonly number[]): number | null {
  const n = sorted.length;
  if (n === 0) {
    return null;
  }
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) {
    return sorted[mid]!;
  }
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function sampleStddev(values: readonly number[], mean: number): number | null {
  const n = values.length;
  if (n < 2) {
    return null;
  }
  let sumSq = 0;
  for (let i = 0; i < n; i += 1) {
    const d = values[i]! - mean;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / (n - 1));
}

export function finalizeNumeric(
  column: string,
  acc: NumericAccumulator,
  warnings: SummaryWarning[],
): NumericColumnSummary {
  if (acc.mixedNonNumeric > 0) {
    pushWarning(warnings, {
      code: 'MIXED_TYPES',
      column,
      message: `Column '${column}' was treated as numeric but contained ${acc.mixedNonNumeric} non-numeric value(s).`,
    });
  }

  if (acc.count === 0) {
    return {
      column,
      treatment: 'numeric',
      count: 0,
      nullCount: acc.nullCount,
      min: null,
      max: null,
      mean: null,
      median: null,
      stddev: null,
      sum: 0,
      distinctCount: 0,
    };
  }

  const sorted = acc.values.slice().sort((a, b) => a - b);
  const mean = acc.sum / acc.count;
  const stddev = sampleStddev(acc.values, mean);
  if (stddev === null) {
    pushWarning(warnings, {
      code: 'STDDEV_UNDEFINED',
      column,
      message: `Column '${column}' has fewer than 2 non-null values; sample stddev is undefined.`,
    });
  }

  const distinct = new Set(acc.values);

  return {
    column,
    treatment: 'numeric',
    count: acc.count,
    nullCount: acc.nullCount,
    min: acc.min,
    max: acc.max,
    mean,
    median: medianOfSorted(sorted),
    stddev,
    sum: acc.sum,
    distinctCount: distinct.size,
  };
}

// ---------------------------------------------------------------------------
// Categorical
// ---------------------------------------------------------------------------

export type CategoricalAccumulator = {
  readonly treatment: 'categorical';
  count: number;
  nullCount: number;
  blankCount: number;
  readonly counts: Map<string, number>;
};

export function createCategoricalAccumulator(): CategoricalAccumulator {
  return {
    treatment: 'categorical',
    count: 0,
    nullCount: 0,
    blankCount: 0,
    counts: new Map(),
  };
}

export function cellToCategoricalString(value: CellValue): string {
  if (value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

export function observeCategorical(
  acc: CategoricalAccumulator,
  value: CellValue,
): void {
  if (value === null) {
    acc.nullCount += 1;
    return;
  }
  acc.count += 1;
  const asString = cellToCategoricalString(value);
  if (asString === '') {
    acc.blankCount += 1;
  }
  acc.counts.set(asString, (acc.counts.get(asString) ?? 0) + 1);
}

export function finalizeCategorical(
  column: string,
  acc: CategoricalAccumulator,
  topN: number,
  warnings: SummaryWarning[],
): CategoricalColumnSummary {
  const entries = [...acc.counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });

  if (entries.length > topN) {
    pushWarning(warnings, {
      code: 'TOP_N_TRUNCATED',
      column,
      message: `Column '${column}' has ${entries.length} distinct values; topValues truncated to ${topN}.`,
    });
  }

  const topValues = entries.slice(0, topN).map(([value, count]) => ({ value, count }));

  return {
    column,
    treatment: 'categorical',
    count: acc.count,
    nullCount: acc.nullCount,
    distinctCount: acc.counts.size,
    blankCount: acc.blankCount,
    topValues,
  };
}

// ---------------------------------------------------------------------------
// Date
// ---------------------------------------------------------------------------

export type DateAccumulator = {
  readonly treatment: 'date';
  count: number;
  nullCount: number;
  min: string | null;
  max: string | null;
  readonly distinct: Set<string>;
  mixedNonDate: number;
};

export function createDateAccumulator(): DateAccumulator {
  return {
    treatment: 'date',
    count: 0,
    nullCount: 0,
    min: null,
    max: null,
    distinct: new Set(),
    mixedNonDate: 0,
  };
}

export function observeDate(acc: DateAccumulator, value: CellValue): void {
  if (value === null) {
    acc.nullCount += 1;
    return;
  }
  if (typeof value === 'string') {
    acc.count += 1;
    acc.distinct.add(value);
    if (acc.min === null || value < acc.min) {
      acc.min = value;
    }
    if (acc.max === null || value > acc.max) {
      acc.max = value;
    }
    return;
  }
  acc.mixedNonDate += 1;
  acc.nullCount += 1;
}

export function finalizeDate(
  column: string,
  acc: DateAccumulator,
  warnings: SummaryWarning[],
): DateColumnSummary {
  if (acc.mixedNonDate > 0) {
    pushWarning(warnings, {
      code: 'MIXED_TYPES',
      column,
      message: `Column '${column}' was treated as date but contained ${acc.mixedNonDate} non-date value(s).`,
    });
  }

  return {
    column,
    treatment: 'date',
    count: acc.count,
    nullCount: acc.nullCount,
    min: acc.min,
    max: acc.max,
    distinctCount: acc.distinct.size,
  };
}

// ---------------------------------------------------------------------------
// Boolean
// ---------------------------------------------------------------------------

export type BooleanAccumulator = {
  readonly treatment: 'boolean';
  count: number;
  nullCount: number;
  trueCount: number;
  falseCount: number;
  mixedNonBoolean: number;
};

export function createBooleanAccumulator(): BooleanAccumulator {
  return {
    treatment: 'boolean',
    count: 0,
    nullCount: 0,
    trueCount: 0,
    falseCount: 0,
    mixedNonBoolean: 0,
  };
}

export function observeBoolean(acc: BooleanAccumulator, value: CellValue): void {
  if (value === null) {
    acc.nullCount += 1;
    return;
  }
  if (typeof value === 'boolean') {
    acc.count += 1;
    if (value) {
      acc.trueCount += 1;
    } else {
      acc.falseCount += 1;
    }
    return;
  }
  acc.mixedNonBoolean += 1;
  acc.nullCount += 1;
}

export function finalizeBoolean(
  column: string,
  acc: BooleanAccumulator,
  warnings: SummaryWarning[],
): BooleanColumnSummary {
  if (acc.mixedNonBoolean > 0) {
    pushWarning(warnings, {
      code: 'MIXED_TYPES',
      column,
      message: `Column '${column}' was treated as boolean but contained ${acc.mixedNonBoolean} non-boolean value(s).`,
    });
  }

  return {
    column,
    treatment: 'boolean',
    count: acc.count,
    nullCount: acc.nullCount,
    trueCount: acc.trueCount,
    falseCount: acc.falseCount,
  };
}

// ---------------------------------------------------------------------------
// Polymorphic column accumulator
// ---------------------------------------------------------------------------

export type ColumnAccumulator =
  | NumericAccumulator
  | CategoricalAccumulator
  | DateAccumulator
  | BooleanAccumulator;

export function createAccumulator(treatment: ColumnTreatment): ColumnAccumulator {
  switch (treatment) {
    case 'numeric':
      return createNumericAccumulator();
    case 'categorical':
      return createCategoricalAccumulator();
    case 'date':
      return createDateAccumulator();
    case 'boolean':
      return createBooleanAccumulator();
  }
}

export function observeCell(acc: ColumnAccumulator, value: CellValue): void {
  switch (acc.treatment) {
    case 'numeric':
      observeNumeric(acc, value);
      return;
    case 'categorical':
      observeCategorical(acc, value);
      return;
    case 'date':
      observeDate(acc, value);
      return;
    case 'boolean':
      observeBoolean(acc, value);
  }
}

export function finalizeAccumulator(
  column: string,
  acc: ColumnAccumulator,
  topN: number,
  warnings: SummaryWarning[],
): ColumnSummary {
  switch (acc.treatment) {
    case 'numeric':
      return finalizeNumeric(column, acc, warnings);
    case 'categorical':
      return finalizeCategorical(column, acc, topN, warnings);
    case 'date':
      return finalizeDate(column, acc, warnings);
    case 'boolean':
      return finalizeBoolean(column, acc, warnings);
  }
}
