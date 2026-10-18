/**
 * Inline accumulation of OverlaySummary.targetColumns during compose.
 * Same stats primitives as summarizeWorkbook — no second workbook walk.
 */
import type {
  CellValue,
  ColumnSummary,
  ColumnTreatment,
  Row,
  SummaryWarning,
} from '../types.js';
import { classifyCell, noteInferenceFallback, type CellKind } from './infer.js';
import {
  createAccumulator,
  DEFAULT_TOP_N,
  finalizeAccumulator,
  observeCell,
} from './stats.js';

type DerivedColumnState = {
  readonly name: string;
  readonly index: number;
  sawNumber: boolean;
  sawBoolean: boolean;
  sawIsoDate: boolean;
  sawString: boolean;
  nonNull: number;
  readonly values: CellValue[];
};

export type DerivedColumnTracker = {
  readonly columns: DerivedColumnState[];
  readonly topN: number;
};

export function createDerivedColumnTracker(
  derivedNames: readonly string[],
  headerIndexByName: ReadonlyMap<string, number>,
  topN: number = DEFAULT_TOP_N,
): DerivedColumnTracker {
  const columns: DerivedColumnState[] = [];
  for (const name of derivedNames) {
    const index = headerIndexByName.get(name);
    if (index === undefined) {
      continue;
    }
    columns.push({
      name,
      index,
      sawNumber: false,
      sawBoolean: false,
      sawIsoDate: false,
      sawString: false,
      nonNull: 0,
      values: [],
    });
  }
  return { columns, topN };
}

function noteKind(state: DerivedColumnState, kind: CellKind): void {
  if (kind === 'null') {
    return;
  }
  state.nonNull += 1;
  switch (kind) {
    case 'number':
      state.sawNumber = true;
      break;
    case 'boolean':
      state.sawBoolean = true;
      break;
    case 'isoDate':
      state.sawIsoDate = true;
      break;
    case 'string':
      state.sawString = true;
      break;
  }
}

function inferFromFlags(
  state: DerivedColumnState,
): { treatment: ColumnTreatment; fellBack: boolean } | 'all-null' {
  if (state.nonNull === 0) {
    return 'all-null';
  }
  const kindCount =
    (state.sawNumber ? 1 : 0) +
    (state.sawBoolean ? 1 : 0) +
    (state.sawIsoDate ? 1 : 0) +
    (state.sawString ? 1 : 0);
  if (kindCount > 1) {
    return { treatment: 'categorical', fellBack: true };
  }
  if (state.sawBoolean) {
    return { treatment: 'boolean', fellBack: false };
  }
  if (state.sawNumber) {
    return { treatment: 'numeric', fellBack: false };
  }
  if (state.sawIsoDate) {
    return { treatment: 'date', fellBack: false };
  }
  return { treatment: 'categorical', fellBack: false };
}

/** Observe one output row's derived cells. */
export function observeDerivedRow(
  tracker: DerivedColumnTracker,
  row: Row,
): void {
  for (const col of tracker.columns) {
    const value = row[col.index] ?? null;
    noteKind(col, classifyCell(value));
    col.values.push(value);
  }
}

export function finalizeDerivedColumns(
  tracker: DerivedColumnTracker,
  warnings: SummaryWarning[] = [],
): ColumnSummary[] {
  const out: ColumnSummary[] = [];

  for (const col of tracker.columns) {
    const inferred = inferFromFlags(col);
    let treatment: ColumnTreatment;
    let fellBack = false;

    if (inferred === 'all-null') {
      treatment = 'categorical';
    } else {
      treatment = inferred.treatment;
      fellBack = inferred.fellBack;
    }

    if (fellBack) {
      noteInferenceFallback(col.name, warnings);
    }

    const acc = createAccumulator(treatment);
    for (const v of col.values) {
      observeCell(acc, v);
    }
    out.push(finalizeAccumulator(col.name, acc, tracker.topN, warnings));
  }

  return out;
}

/**
 * Tracker for fn-compose derived columns (new keys beyond base headers)
 * after the column union is known.
 */
export function createFnDerivedTracker(
  outputHeaders: readonly string[],
  baseHeaders: readonly string[],
  topN: number = DEFAULT_TOP_N,
): DerivedColumnTracker {
  const baseSet = new Set(baseHeaders);
  const derivedNames = outputHeaders.filter((h) => !baseSet.has(h));
  const indexByName = new Map<string, number>();
  for (let i = 0; i < outputHeaders.length; i += 1) {
    indexByName.set(outputHeaders[i]!, i);
  }
  return createDerivedColumnTracker(derivedNames, indexByName, topN);
}

/** Tracker for rules-compose targets. */
export function createRulesDerivedTracker(
  outputHeaders: readonly string[],
  targetNames: readonly string[],
  topN: number = DEFAULT_TOP_N,
): DerivedColumnTracker {
  const uniqueTargets = [...new Set(targetNames)];
  const indexByName = new Map<string, number>();
  for (let i = 0; i < outputHeaders.length; i += 1) {
    indexByName.set(outputHeaders[i]!, i);
  }
  return createDerivedColumnTracker(uniqueTargets, indexByName, topN);
}
