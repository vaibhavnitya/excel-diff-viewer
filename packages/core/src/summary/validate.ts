import { createDiffError } from '../errors.js';
import { err, ok } from '../result.js';
import type {
  ColumnTreatment,
  DiffError,
  Result,
  Sheet,
  SummaryConfig,
  Workbook,
} from '../types.js';

const VALID_TREATMENTS: ReadonlySet<string> = new Set([
  'numeric',
  'categorical',
  'date',
  'boolean',
]);

export type ValidatedSummaryConfig = {
  readonly columns: Readonly<Record<string, ColumnTreatment>>;
  readonly exclude: ReadonlySet<string>;
  readonly topN: number;
  readonly sheet: Sheet;
  /** Resolved config object used as cache key (caller-supplied or frozen empty). */
  readonly configRef: SummaryConfig;
};

function headerSet(headers: readonly string[]): Set<string> {
  return new Set(headers);
}

/**
 * Validate SummaryConfig against a workbook before any column walking.
 */
export function validateSummaryConfig(
  workbook: Workbook,
  config: SummaryConfig | undefined,
): Result<ValidatedSummaryConfig, DiffError> {
  const configRef: SummaryConfig = config ?? {};

  // Sheet resolution
  let sheet: Sheet;
  if (configRef.sheetName !== undefined) {
    const found = workbook.sheets.find((s) => s.name === configRef.sheetName);
    if (found === undefined) {
      return err(
        createDiffError(
          'SUMMARY_COLUMN_NOT_FOUND',
          `Sheet '${configRef.sheetName}' was not found in file '${workbook.meta.filename ?? 'unknown'}'. Available: [${workbook.sheets.map((s) => s.name).join(', ')}].`,
          {
            sheetName: configRef.sheetName,
            filename: workbook.meta.filename,
          },
        ),
      );
    }
    sheet = found;
  } else {
    const first = workbook.sheets[0];
    if (first === undefined) {
      return err(
        createDiffError(
          'SUMMARY_INVALID_CONFIG',
          `File '${workbook.meta.filename ?? 'unknown'}' has no sheets to summarize.`,
          { filename: workbook.meta.filename },
        ),
      );
    }
    sheet = first;
  }

  const headers = headerSet(sheet.headers);

  // topN
  let topN = 10;
  if (configRef.topN !== undefined) {
    const n = configRef.topN;
    if (!Number.isInteger(n) || n < 1) {
      return err(
        createDiffError(
          'SUMMARY_INVALID_CONFIG',
          `SummaryConfig.topN must be a positive integer; got ${String(n)}.`,
          { topN: n },
        ),
      );
    }
    topN = n;
  }

  // columns overrides
  const columns: Record<string, ColumnTreatment> = {};
  if (configRef.columns !== undefined) {
    for (const [name, treatment] of Object.entries(configRef.columns)) {
      if (!headers.has(name)) {
        return err(
          createDiffError(
            'SUMMARY_COLUMN_NOT_FOUND',
            `SummaryConfig.columns refers to column '${name}', which is not in sheet '${sheet.name}' headers [${sheet.headers.join(', ')}].`,
            { column: name, sheetName: sheet.name },
          ),
        );
      }
      if (!VALID_TREATMENTS.has(treatment)) {
        return err(
          createDiffError(
            'SUMMARY_INVALID_CONFIG',
            `SummaryConfig.columns['${name}'] has invalid treatment '${String(treatment)}'. Expected 'numeric' | 'categorical' | 'date' | 'boolean'.`,
            { column: name, treatment },
          ),
        );
      }
      columns[name] = treatment;
    }
  }

  // exclude
  const exclude = new Set<string>();
  if (configRef.exclude !== undefined) {
    for (const name of configRef.exclude) {
      if (name === '') {
        return err(
          createDiffError(
            'SUMMARY_INVALID_CONFIG',
            `SummaryConfig.exclude must not contain empty strings.`,
            { exclude: configRef.exclude },
          ),
        );
      }
      if (!headers.has(name)) {
        return err(
          createDiffError(
            'SUMMARY_COLUMN_NOT_FOUND',
            `SummaryConfig.exclude refers to column '${name}', which is not in sheet '${sheet.name}' headers [${sheet.headers.join(', ')}].`,
            { column: name, sheetName: sheet.name },
          ),
        );
      }
      exclude.add(name);
    }
  }

  return ok({
    columns,
    exclude,
    topN,
    sheet,
    configRef,
  });
}
