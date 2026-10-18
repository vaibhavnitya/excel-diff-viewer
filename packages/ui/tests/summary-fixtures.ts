import type {
  BooleanColumnSummary,
  CategoricalColumnSummary,
  DateColumnSummary,
  DiffSummary,
  NumericColumnSummary,
  OverlaySummary,
  WorkbookSummary,
} from '@mojro/excel-diff-core';

export const numericColumn: NumericColumnSummary = {
  column: 'Unit Rate',
  treatment: 'numeric',
  count: 4,
  nullCount: 0,
  min: 10,
  max: 40,
  mean: 25,
  median: 25,
  stddev: 12.909,
  sum: 100,
  distinctCount: 4,
};

export const categoricalColumn: CategoricalColumnSummary = {
  column: 'Mode',
  treatment: 'categorical',
  count: 5,
  nullCount: 0,
  distinctCount: 3,
  blankCount: 1,
  topValues: [
    { value: 'air', count: 3 },
    { value: 'ocean', count: 1 },
    { value: '', count: 1 },
  ],
};

export const dateColumn: DateColumnSummary = {
  column: 'Effective',
  treatment: 'date',
  count: 2,
  nullCount: 0,
  min: '2024-01-01',
  max: '2024-06-15',
  distinctCount: 2,
};

export const booleanColumn: BooleanColumnSummary = {
  column: 'Active',
  treatment: 'boolean',
  count: 5,
  nullCount: 0,
  trueCount: 3,
  falseCount: 2,
};

export const workbookSummary: WorkbookSummary = {
  sheetName: 'Rates',
  rowCount: 5,
  columnCount: 4,
  columns: [numericColumn, categoricalColumn, dateColumn, booleanColumn],
  skippedColumns: [],
  warnings: [],
};

export const emptyWorkbookSummary: WorkbookSummary = {
  sheetName: 'Empty',
  rowCount: 0,
  columnCount: 0,
  columns: [],
  skippedColumns: [],
  warnings: [],
};

export const diffSummary: DiffSummary = {
  totalKeys: 10,
  added: 2,
  removed: 1,
  modified: 3,
  unchanged: 4,
  fieldChanges: [
    {
      field: 'rate',
      changedRows: 3,
      numericChanges: {
        meanDelta: 1.5,
        meanAbsDelta: 1.5,
        maxAbsDelta: 3,
        increased: 2,
        decreased: 1,
      },
      categoricalChanges: null,
    },
    {
      field: 'mode',
      changedRows: 2,
      numericChanges: null,
      categoricalChanges: {
        topTransitions: [
          { from: 'air', to: 'ocean', count: 2 },
        ],
      },
    },
  ],
  warnings: [],
};

export const overlaySummary: OverlaySummary = {
  totalBase: 20,
  totalOverlay: 10,
  matched: 18,
  unmatched: 2,
  droppedByCompose: 0,
  targetColumns: [numericColumn, categoricalColumn],
};

export const overlaySummaryEmptyTargets: OverlaySummary = {
  totalBase: 5,
  totalOverlay: 3,
  matched: 5,
  unmatched: 0,
  droppedByCompose: 0,
  targetColumns: [],
};
