import { createDiffError } from '../errors.js';
import { err, ok } from '../result.js';
import type {
  ColumnSummary,
  ColumnTreatment,
  DiffControl,
  DiffError,
  Result,
  Sheet,
  SkippedColumn,
  SummaryCache,
  SummaryConfig,
  SummaryWarning,
  Workbook,
  WorkbookSummary,
} from '../types.js';
import { cacheGet, cacheSet } from './cache.js';
import {
  inferTreatmentFromSheetColumn,
  noteInferenceFallback,
} from './infer.js';
import {
  createAccumulator,
  finalizeAccumulator,
  observeCell,
  type ColumnAccumulator,
} from './stats.js';
import { validateSummaryConfig } from './validate.js';

export { createSummaryCache } from './cache.js';

/** Rows processed per async chunk within a tall column. */
export const SUMMARY_COLUMN_CHUNK_ROWS = 10_000;

/**
 * Stable default config reference so omitted `config` still cache-hits
 * across calls (reference identity — not a fresh `{}` each time).
 */
export const DEFAULT_SUMMARY_CONFIG: SummaryConfig = Object.freeze({});

function defaultYield(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function resolveConfigRef(config?: SummaryConfig): SummaryConfig {
  return config ?? DEFAULT_SUMMARY_CONFIG;
}

function totalCellsForWorkbook(
  workbook: Workbook,
  config: SummaryConfig,
): number {
  const sheet =
    config.sheetName !== undefined
      ? workbook.sheets.find((s) => s.name === config.sheetName)
      : workbook.sheets[0];
  if (sheet === undefined) {
    return 0;
  }
  return sheet.rows.length * sheet.headers.length;
}

function summarizeColumnSync(
  sheet: Sheet,
  columnIndex: number,
  columnName: string,
  treatment: ColumnTreatment,
  topN: number,
  warnings: SummaryWarning[],
): ColumnSummary {
  const acc = createAccumulator(treatment);
  const rows = sheet.rows;
  for (let r = 0; r < rows.length; r += 1) {
    observeCell(acc, rows[r]![columnIndex] ?? null);
  }
  return finalizeAccumulator(columnName, acc, topN, warnings);
}

function buildWorkbookSummary(
  sheet: Sheet,
  columns: readonly ColumnSummary[],
  skippedColumns: readonly SkippedColumn[],
  warnings: readonly SummaryWarning[],
): WorkbookSummary {
  return {
    sheetName: sheet.name,
    rowCount: sheet.rows.length,
    columnCount: sheet.headers.length,
    columns,
    skippedColumns,
    warnings,
  };
}

/**
 * Core sync summarization (no cache). Assumes config already validated.
 */
function summarizeValidated(
  sheet: Sheet,
  columnOverrides: Readonly<Record<string, ColumnTreatment>>,
  exclude: ReadonlySet<string>,
  topN: number,
): WorkbookSummary {
  const warnings: SummaryWarning[] = [];
  const skippedColumns: SkippedColumn[] = [];
  const columns: ColumnSummary[] = [];

  for (let c = 0; c < sheet.headers.length; c += 1) {
    const name = sheet.headers[c]!;

    if (exclude.has(name)) {
      skippedColumns.push({ column: name, reason: 'excluded' });
      continue;
    }

    const override = columnOverrides[name];
    let treatment: ColumnTreatment;

    if (override !== undefined) {
      treatment = override;
    } else {
      const inferred = inferTreatmentFromSheetColumn(sheet.rows, c);
      if (inferred.kind === 'all-null') {
        skippedColumns.push({ column: name, reason: 'all-null' });
        continue;
      }
      treatment = inferred.treatment;
      if (inferred.fellBack) {
        noteInferenceFallback(name, warnings);
      }
    }

    columns.push(summarizeColumnSync(sheet, c, name, treatment, topN, warnings));
  }

  return buildWorkbookSummary(sheet, columns, skippedColumns, warnings);
}

/**
 * Summarize one sheet of a workbook (sync).
 * Optional `cache` keys on reference identity of `workbook` and `config`.
 */
export function summarizeWorkbook(
  workbook: Workbook,
  config?: SummaryConfig,
  cache?: SummaryCache,
): Result<WorkbookSummary, DiffError> {
  const configRef = resolveConfigRef(config);

  if (cache !== undefined) {
    const hit = cacheGet(cache, workbook, configRef);
    if (hit !== undefined) {
      return ok(hit);
    }
  }

  const validated = validateSummaryConfig(workbook, configRef);
  if (!validated.ok) {
    return validated;
  }

  const summary = summarizeValidated(
    validated.value.sheet,
    validated.value.columns,
    validated.value.exclude,
    validated.value.topN,
  );

  if (cache !== undefined) {
    cacheSet(cache, workbook, configRef, summary);
  }

  return ok(summary);
}

type AsyncColumnPlan = {
  readonly index: number;
  readonly name: string;
  readonly treatment: ColumnTreatment;
};

/**
 * Chunked, cancellable summarization.
 * Progress is `(processedCells, totalCells)` where total = rowCount × columnCount.
 * Always emits a final `(total, total)` when control is provided.
 */
export async function summarizeWorkbookAsync(
  workbook: Workbook,
  config?: SummaryConfig,
  cache?: SummaryCache,
  control?: DiffControl,
): Promise<Result<WorkbookSummary, DiffError>> {
  if (control === undefined) {
    return summarizeWorkbook(workbook, config, cache);
  }

  const configRef = resolveConfigRef(config);

  if (cache !== undefined) {
    const hit = cacheGet(cache, workbook, configRef);
    if (hit !== undefined) {
      const total = totalCellsForWorkbook(workbook, configRef);
      control.onProgress(total, total);
      return ok(hit);
    }
  }

  const validated = validateSummaryConfig(workbook, configRef);
  if (!validated.ok) {
    return validated;
  }

  const { sheet, columns: columnOverrides, exclude, topN } = validated.value;
  const rowCount = sheet.rows.length;
  const columnCount = sheet.headers.length;
  const totalCells = rowCount * columnCount;
  const yieldBetween = control.yieldBetweenChunks ?? defaultYield;

  const emitFinal = (): void => {
    control.onProgress(totalCells, totalCells);
  };

  // Plan columns (inference is sync and cheap relative to stats for tall cols).
  const plans: AsyncColumnPlan[] = [];
  const skippedColumns: SkippedColumn[] = [];
  const warnings: SummaryWarning[] = [];

  for (let c = 0; c < sheet.headers.length; c += 1) {
    const name = sheet.headers[c]!;
    if (exclude.has(name)) {
      skippedColumns.push({ column: name, reason: 'excluded' });
      continue;
    }
    const override = columnOverrides[name];
    if (override !== undefined) {
      plans.push({ index: c, name, treatment: override });
      continue;
    }
    const inferred = inferTreatmentFromSheetColumn(sheet.rows, c);
    if (inferred.kind === 'all-null') {
      skippedColumns.push({ column: name, reason: 'all-null' });
      continue;
    }
    if (inferred.fellBack) {
      noteInferenceFallback(name, warnings);
    }
    plans.push({ index: c, name, treatment: inferred.treatment });
  }

  const columnSummaries: ColumnSummary[] = [];
  let processedCells = 0;

  // Count skipped / excluded columns toward progress (their cells are "done").
  const plannedIndexes = new Set(plans.map((p) => p.index));
  for (let c = 0; c < columnCount; c += 1) {
    if (!plannedIndexes.has(c)) {
      processedCells += rowCount;
    }
  }

  for (const plan of plans) {
    if (control.isCancelled()) {
      return err(
        createDiffError('CANCELLED', 'Summary was cancelled before completion.', {
          processed: processedCells,
          total: totalCells,
        }),
      );
    }

    const acc: ColumnAccumulator = createAccumulator(plan.treatment);
    let row = 0;
    while (row < rowCount) {
      if (control.isCancelled()) {
        return err(
          createDiffError('CANCELLED', 'Summary was cancelled before completion.', {
            processed: processedCells,
            total: totalCells,
          }),
        );
      }

      const end = Math.min(row + SUMMARY_COLUMN_CHUNK_ROWS, rowCount);
      for (let r = row; r < end; r += 1) {
        observeCell(acc, sheet.rows[r]![plan.index] ?? null);
      }
      processedCells += end - row;
      control.onProgress(processedCells, totalCells);
      row = end;
      if (row < rowCount) {
        await yieldBetween();
      }
    }

    columnSummaries.push(
      finalizeAccumulator(plan.name, acc, topN, warnings),
    );
  }

  if (control.isCancelled()) {
    return err(
      createDiffError('CANCELLED', 'Summary was cancelled before completion.', {
        processed: processedCells,
        total: totalCells,
      }),
    );
  }

  emitFinal();

  const summary = buildWorkbookSummary(
    sheet,
    columnSummaries,
    skippedColumns,
    warnings,
  );

  if (cache !== undefined) {
    cacheSet(cache, workbook, configRef, summary);
  }

  return ok(summary);
}
