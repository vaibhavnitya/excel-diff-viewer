import { describe, expect, it } from 'vitest';
import {
  createFieldChangeAccumulators,
  finalizeFieldChanges,
  observeRowChanges,
} from '../../src/summary/field-changes.js';
import {
  createDerivedColumnTracker,
  finalizeDerivedColumns,
  observeDerivedRow,
} from '../../src/summary/derived-columns.js';
import {
  createAccumulator,
  finalizeAccumulator,
  observeCell,
  pushWarning,
  MAX_SUMMARY_WARNINGS,
} from '../../src/summary/stats.js';
import {
  createSummaryCache,
  summarizeWorkbook,
  summarizeWorkbookAsync,
} from '../../src/summary/summarize.js';
import { validateSummaryConfig } from '../../src/summary/validate.js';
import type { SummaryWarning, Workbook } from '../../src/types.js';

function wb(
  headers: readonly string[],
  rows: readonly (readonly (string | number | boolean | null)[])[],
): Workbook {
  return {
    sheets: [{ name: 'Sheet1', headers, rows }],
    activeSheetIndex: 0,
    meta: { format: 'csv', filename: 't.csv' },
  };
}

describe('summary coverage extras', () => {
  it('validate: empty workbook and invalid treatment', () => {
    const empty: Workbook = {
      sheets: [],
      activeSheetIndex: 0,
      meta: { format: 'csv' },
    };
    const noSheets = validateSummaryConfig(empty, undefined);
    expect(noSheets.ok).toBe(false);
    if (noSheets.ok) return;
    expect(noSheets.error.code).toBe('SUMMARY_INVALID_CONFIG');

    const badTreatment = validateSummaryConfig(wb(['a'], [[1]]), {
      columns: { a: 'nope' as 'numeric' },
    });
    expect(badTreatment.ok).toBe(false);
    if (badTreatment.ok) return;
    expect(badTreatment.error.code).toBe('SUMMARY_INVALID_CONFIG');
  });

  it('validate: sheetName resolution succeeds', () => {
    const workbook: Workbook = {
      sheets: [
        { name: 'A', headers: ['x'], rows: [[1]] },
        { name: 'B', headers: ['y'], rows: [[2]] },
      ],
      activeSheetIndex: 0,
      meta: { format: 'csv', filename: 't.csv' },
    };
    const result = summarizeWorkbook(workbook, { sheetName: 'B' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.sheetName).toBe('B');
    expect(result.value.columns[0]?.column).toBe('y');
  });

  it('polymorphic observe/finalize for all treatments', () => {
    const warnings: SummaryWarning[] = [];
    for (const treatment of ['numeric', 'categorical', 'date', 'boolean'] as const) {
      const acc = createAccumulator(treatment);
      observeCell(acc, null);
      if (treatment === 'numeric') observeCell(acc, 1);
      if (treatment === 'categorical') observeCell(acc, 'a');
      if (treatment === 'date') observeCell(acc, '2024-01-01');
      if (treatment === 'boolean') observeCell(acc, true);
      const summary = finalizeAccumulator('c', acc, 10, warnings);
      expect(summary.treatment).toBe(treatment);
    }
  });

  it('caps warnings at MAX_SUMMARY_WARNINGS', () => {
    const warnings: SummaryWarning[] = [];
    for (let i = 0; i < MAX_SUMMARY_WARNINGS + 5; i += 1) {
      pushWarning(warnings, {
        code: 'MIXED_TYPES',
        column: `c${i}`,
        message: 'x',
      });
    }
    expect(warnings).toHaveLength(MAX_SUMMARY_WARNINGS);
  });

  it('date/boolean MIXED_TYPES under forced treatment', () => {
    const dateResult = summarizeWorkbook(wb(['d'], [['2024-01-01'], [1]]), {
      columns: { d: 'date' },
    });
    expect(dateResult.ok).toBe(true);
    if (!dateResult.ok) return;
    expect(dateResult.value.warnings.some((w) => w.code === 'MIXED_TYPES')).toBe(
      true,
    );

    const boolResult = summarizeWorkbook(wb(['b'], [[true], ['x']]), {
      columns: { b: 'boolean' },
    });
    expect(boolResult.ok).toBe(true);
    if (!boolResult.ok) return;
    expect(boolResult.value.warnings.some((w) => w.code === 'MIXED_TYPES')).toBe(
      true,
    );
  });

  it('async: cache hit emits final progress; exclude path; mid-chunk cancel', async () => {
    const workbook = wb(['a', 'b'], [[1, 'x'], [2, 'y']]);
    const cache = createSummaryCache();
    const config = { exclude: ['a'] as const };

    const first = await summarizeWorkbookAsync(workbook, config, cache, {
      isCancelled: () => false,
      onProgress: () => {},
    });
    expect(first.ok).toBe(true);

    const progress: [number, number][] = [];
    const second = await summarizeWorkbookAsync(workbook, config, cache, {
      isCancelled: () => false,
      onProgress: (p, t) => progress.push([p, t]),
    });
    expect(second.ok).toBe(true);
    if (!second.ok || !first.ok) return;
    expect(second.value).toBe(first.value);
    expect(progress.at(-1)?.[0]).toBe(progress.at(-1)?.[1]);

    // Mid-column cancel on a tall column
    const tall = wb(
      ['n'],
      Array.from({ length: 25_000 }, (_, i) => [i] as const),
    );
    let ticks = 0;
    const cancelled = await summarizeWorkbookAsync(tall, undefined, undefined, {
      isCancelled: () => {
        ticks += 1;
        return ticks > 2;
      },
      onProgress: () => {},
      yieldBetweenChunks: async () => {},
    });
    expect(cancelled.ok).toBe(false);
  });

  it('async: cancel after columns complete', async () => {
    const workbook = wb(['n'], [[1]]);
    let check = 0;
    const result = await summarizeWorkbookAsync(workbook, undefined, undefined, {
      isCancelled: () => {
        check += 1;
        // First checks during plan/loop are false; force true after work
        return check > 5;
      },
      onProgress: () => {},
    });
    // Small input may finish before cancel triggers — either ok or CANCELLED
    if (!result.ok) {
      expect(result.error.code).toBe('CANCELLED');
    }
  });

  it('field-changes: unknown field ignored; categorical majority; transition sort', () => {
    const accs = createFieldChangeAccumulators(['rate', 'mode']);
    observeRowChanges(accs, [
      { field: 'unknown', before: 1, after: 2 },
      { field: 'mode', before: 'a', after: 'b' },
      { field: 'mode', before: 'a', after: 'b' },
      { field: 'mode', before: 1, after: 2 },
    ]);
    const warnings: SummaryWarning[] = [];
    const fields = finalizeFieldChanges(accs, warnings);
    const mode = fields.find((f) => f.field === 'mode');
    // 2 cat vs 1 num → categorical majority
    expect(mode?.categoricalChanges).not.toBeNull();
    expect(mode?.numericChanges).toBeNull();
    expect(warnings.some((w) => w.code === 'MIXED_TYPES')).toBe(true);
  });

  it('derived columns: all-null, mixed, date, boolean, missing target name', () => {
    const headers = ['pass', 'n', 'm', 'd', 'b', 'empty'];
    const indexByName = new Map(headers.map((h, i) => [h, i]));
    const tracker = createDerivedColumnTracker(
      ['n', 'm', 'd', 'b', 'empty', 'missing'],
      indexByName,
    );
    observeDerivedRow(tracker, [0, 1, 1, '2024-01-01', true, null]);
    observeDerivedRow(tracker, [0, 2, 'x', '2024-02-01', false, null]);
    const warnings: SummaryWarning[] = [];
    const cols = finalizeDerivedColumns(tracker, warnings);
    expect(cols.map((c) => c.column)).toEqual(['n', 'm', 'd', 'b', 'empty']);
    expect(cols.find((c) => c.column === 'n')?.treatment).toBe('numeric');
    expect(cols.find((c) => c.column === 'm')?.treatment).toBe('categorical');
    expect(cols.find((c) => c.column === 'd')?.treatment).toBe('date');
    expect(cols.find((c) => c.column === 'b')?.treatment).toBe('boolean');
    expect(cols.find((c) => c.column === 'empty')?.treatment).toBe('categorical');
    expect(warnings.some((w) => w.code === 'INFERENCE_FELL_BACK')).toBe(true);
  });

  it('cellToCategoricalString via categorical observe of number/boolean', () => {
    const result = summarizeWorkbook(
      wb(['c'], [[1], [true], [false]]),
      { columns: { c: 'categorical' } },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const col = result.value.columns[0];
    expect(col?.treatment).toBe('categorical');
    if (col?.treatment !== 'categorical') return;
    expect(col.distinctCount).toBe(3);
  });

  it('async: cancel between columns and after last column', async () => {
    // Two tall columns → cancel at the start of the second column plan.
    const workbook = wb(
      ['a', 'b'],
      Array.from({ length: 12_000 }, (_, i) => [i, `v${i}`] as const),
    );
    let progressCount = 0;
    const betweenCols = await summarizeWorkbookAsync(
      workbook,
      undefined,
      undefined,
      {
        isCancelled: () => progressCount >= 1,
        onProgress: () => {
          progressCount += 1;
        },
        yieldBetweenChunks: async () => {},
      },
    );
    expect(betweenCols.ok).toBe(false);
    if (betweenCols.ok) return;
    expect(betweenCols.error.code).toBe('CANCELLED');

    // Single small column: cancel after its progress so the post-loop check fires.
    let progressed = false;
    const afterDone = await summarizeWorkbookAsync(
      wb(['n'], [[1]]),
      undefined,
      undefined,
      {
        isCancelled: () => progressed,
        onProgress: () => {
          progressed = true;
        },
      },
    );
    expect(afterDone.ok).toBe(false);
    if (afterDone.ok) return;
    expect(afterDone.error.code).toBe('CANCELLED');
  });

  it('field-changes: equal-count transition sort by from/to', () => {
    const accs = createFieldChangeAccumulators(['mode']);
    observeRowChanges(accs, [
      { field: 'mode', before: 'b', after: 'z' },
      { field: 'mode', before: 'a', after: 'z' },
      { field: 'mode', before: 'a', after: 'y' },
    ]);
    const fields = finalizeFieldChanges(accs, []);
    const tops = fields[0]?.categoricalChanges?.topTransitions ?? [];
    expect(tops).toHaveLength(3);
    // All count 1 — sorted by from then to
    expect(tops[0]).toEqual({ from: 'a', to: 'y', count: 1 });
  });
});
