/**
 * Side-output accumulators for DiffSummary.fieldChanges.
 * Fed from the existing diff pass — never a second walk.
 */
import type {
  CellValue,
  DiffChange,
  FieldChangeAggregate,
  SummaryWarning,
} from '../types.js';
import { cellToCategoricalString, pushWarning } from './stats.js';

const TOP_TRANSITIONS = 10;

type FieldAcc = {
  changedRows: number;
  numericCount: number;
  categoricalCount: number;
  sumDelta: number;
  sumAbsDelta: number;
  maxAbsDelta: number;
  increased: number;
  decreased: number;
  /** key = `${from}\0${to}` */
  readonly transitions: Map<string, { from: string; to: string; count: number }>;
};

function createFieldAcc(): FieldAcc {
  return {
    changedRows: 0,
    numericCount: 0,
    categoricalCount: 0,
    sumDelta: 0,
    sumAbsDelta: 0,
    maxAbsDelta: 0,
    increased: 0,
    decreased: 0,
    transitions: new Map(),
  };
}

function isFiniteNumber(value: CellValue): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Classify one before/after pair.
 * Both finite numbers → numeric; otherwise categorical.
 */
function classifyChange(before: CellValue, after: CellValue): 'numeric' | 'categorical' {
  if (isFiniteNumber(before) && isFiniteNumber(after)) {
    return 'numeric';
  }
  return 'categorical';
}

export type FieldChangeAccumulators = {
  readonly byField: Map<string, FieldAcc>;
  readonly valueFields: readonly string[];
};

export function createFieldChangeAccumulators(
  valueFields: readonly string[],
): FieldChangeAccumulators {
  const byField = new Map<string, FieldAcc>();
  for (const field of valueFields) {
    byField.set(field, createFieldAcc());
  }
  return { byField, valueFields };
}

/** Observe changes from one modified row (already computed by the diff pass). */
export function observeRowChanges(
  accs: FieldChangeAccumulators,
  changes: readonly DiffChange[],
): void {
  for (const change of changes) {
    const acc = accs.byField.get(change.field);
    if (acc === undefined) {
      continue;
    }
    acc.changedRows += 1;
    const kind = classifyChange(change.before, change.after);
    if (kind === 'numeric') {
      acc.numericCount += 1;
      // classifyChange guarantees both are finite numbers
      const before = change.before as number;
      const after = change.after as number;
      const delta = after - before;
      const abs = Math.abs(delta);
      acc.sumDelta += delta;
      acc.sumAbsDelta += abs;
      if (abs > acc.maxAbsDelta) {
        acc.maxAbsDelta = abs;
      }
      if (delta > 0) {
        acc.increased += 1;
      } else if (delta < 0) {
        acc.decreased += 1;
      }
    } else {
      acc.categoricalCount += 1;
      const from = cellToCategoricalString(change.before);
      const to = cellToCategoricalString(change.after);
      const key = `${from}\0${to}`;
      const existing = acc.transitions.get(key);
      if (existing !== undefined) {
        existing.count += 1;
      } else {
        acc.transitions.set(key, { from, to, count: 1 });
      }
    }
  }
}

export function finalizeFieldChanges(
  accs: FieldChangeAccumulators,
  warnings: SummaryWarning[],
): FieldChangeAggregate[] {
  const out: FieldChangeAggregate[] = [];

  for (const field of accs.valueFields) {
    const acc = accs.byField.get(field)!;
    if (acc.changedRows === 0) {
      out.push({
        field,
        changedRows: 0,
        numericChanges: null,
        categoricalChanges: null,
      });
      continue;
    }

    const mixed =
      acc.numericCount > 0 && acc.categoricalCount > 0;
    if (mixed) {
      pushWarning(warnings, {
        code: 'MIXED_TYPES',
        column: field,
        message: `Field '${field}' has mixed numeric and non-numeric changes; classifying by majority.`,
      });
    }

    // Numeric wins ties.
    const preferNumeric = acc.numericCount >= acc.categoricalCount;

    let numericChanges: FieldChangeAggregate['numericChanges'] = null;
    let categoricalChanges: FieldChangeAggregate['categoricalChanges'] = null;

    if (preferNumeric && acc.numericCount > 0) {
      numericChanges = {
        meanDelta: acc.sumDelta / acc.numericCount,
        meanAbsDelta: acc.sumAbsDelta / acc.numericCount,
        maxAbsDelta: acc.maxAbsDelta,
        increased: acc.increased,
        decreased: acc.decreased,
      };
    } else if (acc.categoricalCount > 0) {
      const topTransitions = [...acc.transitions.values()]
        .sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          if (a.from !== b.from) {
            return a.from < b.from ? -1 : 1;
          }
          return a.to < b.to ? -1 : a.to > b.to ? 1 : 0;
        })
        .slice(0, TOP_TRANSITIONS)
        .map(({ from, to, count }) => ({ from, to, count }));
      categoricalChanges = { topTransitions };
    }

    out.push({
      field,
      changedRows: acc.changedRows,
      numericChanges,
      categoricalChanges,
    });
  }

  return out;
}
