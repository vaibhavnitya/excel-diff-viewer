import { createDiffError } from '../errors.js';
import { enforceWorkbookLimits } from '../limits/enforce-limits.js';
import { err, ok } from '../result.js';
import type {
  DiffControl,
  DiffError,
  OverlayMeta,
  OverlayResult,
  OverlayWorkbooksOptions,
  Result,
  Row,
  RowWarning,
  Sheet,
  Workbook,
} from '../types.js';
import {
  createRulesDerivedTracker,
  finalizeDerivedColumns,
  observeDerivedRow,
} from '../summary/derived-columns.js';
import {
  applyRulesToRow,
  buildRulesComposeContext,
} from './compose-rules.js';
import {
  buildDerivedOverlayWorkbook,
  overlaySummaryFromMeta,
} from './build-derived.js';
import {
  assembleFnOverlay,
  type MatchedPair,
  type OverlayFnPairsResult,
} from './fn-pairs.js';
import {
  buildOverlayJoinIndex,
  joinKeyFromSegments,
  lookupOverlayMatches,
  normalizedJoinSegments,
} from './join.js';
import { validateOverlaySchema, type ValidatedOverlay } from './validate.js';

/** Default base rows processed per async chunk (mirrors diff). */
export const DEFAULT_OVERLAY_CHUNK_SIZE = 5000;

export type OverlayEngineOutcome =
  | { readonly kind: 'result'; readonly value: OverlayResult }
  | { readonly kind: 'fn-pairs'; readonly value: OverlayFnPairsResult };

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

function defaultYield(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function workbookLabel(workbook: Workbook, fallback: string): string {
  return workbook.meta.filename !== undefined
    ? `workbook '${workbook.meta.filename}'`
    : fallback;
}

type PreparedOverlay = {
  readonly validated: ValidatedOverlay;
  readonly joinIndex: ReturnType<typeof buildOverlayJoinIndex>;
  readonly base: Workbook;
  readonly overlay: Workbook;
};

function prepareOverlay(
  base: Workbook,
  overlay: Workbook,
  options: OverlayWorkbooksOptions,
): Result<PreparedOverlay, DiffError> {
  const limitedBase = enforceWorkbookLimits(base, options.limits);
  if (!limitedBase.ok) {
    return limitedBase;
  }
  const limitedOverlay = enforceWorkbookLimits(overlay, options.limits);
  if (!limitedOverlay.ok) {
    return limitedOverlay;
  }

  const baseSheetResult = pickSheet(base, options.sheetName);
  if (!baseSheetResult.ok) {
    return baseSheetResult;
  }
  const overlaySheetResult = pickSheet(overlay, options.sheetName);
  if (!overlaySheetResult.ok) {
    return overlaySheetResult;
  }

  const validated = validateOverlaySchema(
    options.schema,
    baseSheetResult.value,
    overlaySheetResult.value,
    workbookLabel(base, 'base workbook'),
    workbookLabel(overlay, 'overlay workbook'),
  );
  if (!validated.ok) {
    return validated;
  }

  const joinIndex = buildOverlayJoinIndex(
    validated.value.overlaySheet,
    validated.value.joinOverlayIndexes,
    validated.value.wildcardOnEmpty,
  );

  return ok({
    validated: validated.value,
    joinIndex,
    base,
    overlay,
  });
}

function ambiguousMatchError(
  baseRowIndex: number,
  baseRow: Row,
  joinBaseIndexes: readonly number[],
  matchIndexes: readonly number[],
): DiffError {
  const key = joinKeyFromSegments(
    normalizedJoinSegments(baseRow, joinBaseIndexes),
  );
  return createDiffError(
    'OVERLAY_AMBIGUOUS_MATCH',
    `OVERLAY_AMBIGUOUS_MATCH: Base row ${baseRowIndex} (key '${key}') matched ${matchIndexes.length} overlay rows at indices [${matchIndexes.join(', ')}]. Under rules compose, each base row may match at most one overlay row. Use fn compose to handle multi-match, or disambiguate the overlay.`,
    {
      baseKey: key,
      baseRowIndex,
      overlayRowIndices: matchIndexes,
    },
  );
}

function runRulesOverlay(prepared: PreparedOverlay): Result<OverlayResult, DiffError> {
  const { validated, joinIndex } = prepared;
  // Caller (overlayWorkbooksInternal) only invokes when compose.kind === 'rules'.
  const rulesCompose = validated.compose as Extract<
    ValidatedOverlay['compose'],
    { kind: 'rules' }
  >;

  const ctx = buildRulesComposeContext(
    validated.passthroughHeaders,
    validated.passthroughIndexes,
    rulesCompose.resolved,
  );

  const derivedTracker = createRulesDerivedTracker(
    ctx.outputHeaders,
    rulesCompose.resolved.map((r) => r.target),
  );

  const baseRows = validated.baseSheet.rows;
  const overlaySheetRows = validated.overlaySheet.rows;
  const outRows: Row[] = [];
  const warnings: RowWarning[] = [];
  let matched = 0;
  let unmatched = 0;

  for (let i = 0; i < baseRows.length; i += 1) {
    const baseRow = baseRows[i]!;
    const matchIndexes = lookupOverlayMatches(
      joinIndex,
      baseRow,
      validated.joinBaseIndexes,
    );

    if (matchIndexes.length > 1) {
      return err(
        ambiguousMatchError(i, baseRow, validated.joinBaseIndexes, matchIndexes),
      );
    }

    let outRow: Row;
    if (matchIndexes.length === 0) {
      unmatched += 1;
      outRow = applyRulesToRow(baseRow, null, i, ctx, warnings);
    } else {
      matched += 1;
      const overlayRow = overlaySheetRows[matchIndexes[0]!]!;
      outRow = applyRulesToRow(baseRow, overlayRow, i, ctx, warnings);
    }
    outRows.push(outRow);
    observeDerivedRow(derivedTracker, outRow);
  }

  const meta: OverlayMeta = {
    totalBase: baseRows.length,
    totalOverlay: joinIndex.totalOverlay,
    matched,
    unmatched,
    droppedByCompose: 0,
    rowWarnings: warnings,
  };

  const targetColumns = finalizeDerivedColumns(derivedTracker);
  const workbook = buildDerivedOverlayWorkbook(
    ctx.outputHeaders,
    outRows,
    validated.baseSheet.name,
    prepared.base.meta.filename,
    meta,
  );

  return ok({ workbook, summary: overlaySummaryFromMeta(meta, targetColumns) });
}

function collectFnPairs(prepared: PreparedOverlay): OverlayFnPairsResult {
  const { validated, joinIndex } = prepared;
  const baseRows = validated.baseSheet.rows;
  const overlaySheetRows = validated.overlaySheet.rows;
  const pairs: MatchedPair[] = [];
  let matched = 0;
  let unmatched = 0;

  for (let i = 0; i < baseRows.length; i += 1) {
    const baseRow = baseRows[i]!;
    const matchIndexes = lookupOverlayMatches(
      joinIndex,
      baseRow,
      validated.joinBaseIndexes,
    );
    const overlayMatches = matchIndexes.map((idx) => overlaySheetRows[idx]!);
    if (matchIndexes.length === 0) {
      unmatched += 1;
    } else {
      matched += 1;
    }
    pairs.push({
      baseRow,
      overlayRows: overlayMatches,
      baseRowIndex: i,
    });
  }

  return {
    kind: 'fn-pairs',
    pairs,
    baseHeaders: validated.baseSheet.headers,
    overlayHeaders: validated.overlaySheet.headers,
    schema: validated.schema,
    summary: {
      totalBase: baseRows.length,
      totalOverlay: joinIndex.totalOverlay,
      matched,
      unmatched,
    },
    sheetName: validated.baseSheet.name,
    baseFilename: prepared.base.meta.filename,
  };
}

function finishFnInline(pairsResult: OverlayFnPairsResult): OverlayResult {
  // pairsResult is only produced for fn compose; fn may be a Worker stub when deferred.
  const compose = pairsResult.schema.compose as Extract<
    OverlayWorkbooksOptions['schema']['compose'],
    { kind: 'fn' }
  >;

  const assembled = assembleFnOverlay(
    pairsResult.pairs,
    compose.fn,
    pairsResult.baseHeaders,
    pairsResult.overlayHeaders,
    pairsResult.sheetName,
    pairsResult.baseFilename,
    pairsResult.summary,
  );

  const meta: OverlayMeta = {
    ...pairsResult.summary,
    droppedByCompose: assembled.droppedByCompose,
    rowWarnings: [],
  };

  const workbook = buildDerivedOverlayWorkbook(
    assembled.headers,
    assembled.rows,
    pairsResult.sheetName,
    pairsResult.baseFilename,
    meta,
  );

  return {
    workbook,
    summary: overlaySummaryFromMeta(meta, assembled.targetColumns),
  };
}

/**
 * Internal engine entry. When `deferFnCompose` is true and compose is `fn`,
 * returns matched pairs for the react/Worker boundary; otherwise always
 * returns a finished {@link OverlayResult} (runs `fn` inline when needed).
 */
export function overlayWorkbooksInternal(
  base: Workbook,
  overlay: Workbook,
  options: OverlayWorkbooksOptions,
  deferFnCompose: boolean,
): Result<OverlayEngineOutcome, DiffError> {
  const prepared = prepareOverlay(base, overlay, options);
  if (!prepared.ok) {
    return prepared;
  }

  if (prepared.value.validated.compose.kind === 'rules') {
    const result = runRulesOverlay(prepared.value);
    if (!result.ok) {
      return result;
    }
    return ok({ kind: 'result', value: result.value });
  }

  const pairs = collectFnPairs(prepared.value);
  if (deferFnCompose) {
    return ok({ kind: 'fn-pairs', value: pairs });
  }
  return ok({ kind: 'result', value: finishFnInline(pairs) });
}

/**
 * Compose a base workbook with an overlay workbook into a derived workbook.
 *
 * For `compose.kind === 'fn'`, runs `fn` inline on this thread (Node / direct call).
 * The Worker path uses {@link overlayWorkbooksInternal} with `deferFnCompose: true`
 * so `fn` can run on the main thread.
 */
export function overlayWorkbooks(
  base: Workbook,
  overlay: Workbook,
  options: OverlayWorkbooksOptions,
): Result<OverlayResult, DiffError> {
  const outcome = overlayWorkbooksInternal(base, overlay, options, false);
  if (!outcome.ok) {
    return outcome;
  }
  // deferFnCompose: false always finishes to a result (rules or inline fn).
  return ok(
    (outcome.value as Extract<OverlayEngineOutcome, { kind: 'result' }>).value,
  );
}

/**
 * Async overlay with optional cooperative {@link DiffControl}.
 * Always emits a final `onProgress(total, total)` when control is provided,
 * even for single-chunk inputs.
 *
 * When `control` is omitted, short-circuits to the sync path.
 */
export async function overlayWorkbooksAsync(
  base: Workbook,
  overlay: Workbook,
  options: OverlayWorkbooksOptions,
  control?: DiffControl,
): Promise<Result<OverlayResult, DiffError>> {
  if (control === undefined) {
    return overlayWorkbooks(base, overlay, options);
  }

  const prepared = prepareOverlay(base, overlay, options);
  if (!prepared.ok) {
    return prepared;
  }

  const { validated, joinIndex } = prepared.value;
  const baseRows = validated.baseSheet.rows;
  const total = baseRows.length;
  const chunkSize = control.chunkSize ?? DEFAULT_OVERLAY_CHUNK_SIZE;
  const yieldBetween = control.yieldBetweenChunks ?? defaultYield;

  // Emit progress even when total is 0 or fits in one chunk.
  const emitFinal = (processed: number): void => {
    control.onProgress(processed, total);
  };

  if (validated.compose.kind === 'fn') {
    // Build pairs in chunks, then run fn inline (direct-call / Node path).
    const pairs: MatchedPair[] = [];
    let matched = 0;
    let unmatched = 0;
    const overlaySheetRows = validated.overlaySheet.rows;

    for (let i = 0; i < baseRows.length; i += chunkSize) {
      if (control.isCancelled()) {
        return err(
          createDiffError('CANCELLED', 'Overlay was cancelled before completion.', {
            processed: i,
            total,
          }),
        );
      }

      const end = Math.min(i + chunkSize, baseRows.length);
      for (let j = i; j < end; j += 1) {
        const baseRow = baseRows[j]!;
        const matchIndexes = lookupOverlayMatches(
          joinIndex,
          baseRow,
          validated.joinBaseIndexes,
        );
        if (matchIndexes.length === 0) {
          unmatched += 1;
        } else {
          matched += 1;
        }
        pairs.push({
          baseRow,
          overlayRows: matchIndexes.map((idx) => overlaySheetRows[idx]!),
          baseRowIndex: j,
        });
      }

      control.onProgress(end, total);
      if (end < baseRows.length) {
        await yieldBetween();
      }
    }

    // Guarantee final (total, total) even if the loop never ran (total === 0).
    if (total === 0) {
      emitFinal(0);
    }

    if (control.isCancelled()) {
      return err(
        createDiffError('CANCELLED', 'Overlay was cancelled before completion.', {
          processed: total,
          total,
        }),
      );
    }

    // Narrowed: we are inside `validated.compose.kind === 'fn'`.
    const compose = validated.schema.compose as Extract<
      OverlayWorkbooksOptions['schema']['compose'],
      { kind: 'fn' }
    >;

    const partialSummary = {
      totalBase: total,
      totalOverlay: joinIndex.totalOverlay,
      matched,
      unmatched,
    };

    const assembled = assembleFnOverlay(
      pairs,
      compose.fn,
      validated.baseSheet.headers,
      validated.overlaySheet.headers,
      validated.baseSheet.name,
      prepared.value.base.meta.filename,
      partialSummary,
      {
        isCancelled: control.isCancelled,
        onProgress: undefined,
      },
    );

    if (assembled.cancelled) {
      return err(
        createDiffError('CANCELLED', 'Overlay was cancelled before completion.', {
          processed: total,
          total,
        }),
      );
    }

    const meta: OverlayMeta = {
      ...partialSummary,
      droppedByCompose: assembled.droppedByCompose,
      rowWarnings: [],
    };

    const workbook = buildDerivedOverlayWorkbook(
      assembled.headers,
      assembled.rows,
      validated.baseSheet.name,
      prepared.value.base.meta.filename,
      meta,
    );

    return ok({
      workbook,
      summary: overlaySummaryFromMeta(meta, assembled.targetColumns),
    });
  }

  // rules path — chunked (compose.kind narrowed by the fn early-return above)
  const rulesCompose = validated.compose as Extract<
    ValidatedOverlay['compose'],
    { kind: 'rules' }
  >;
  const ctx = buildRulesComposeContext(
    validated.passthroughHeaders,
    validated.passthroughIndexes,
    rulesCompose.resolved,
  );
  const derivedTracker = createRulesDerivedTracker(
    ctx.outputHeaders,
    rulesCompose.resolved.map((r) => r.target),
  );
  const overlaySheetRows = validated.overlaySheet.rows;
  const outRows: Row[] = [];
  const warnings: RowWarning[] = [];
  let matched = 0;
  let unmatched = 0;

  for (let i = 0; i < baseRows.length; i += chunkSize) {
    if (control.isCancelled()) {
      return err(
        createDiffError('CANCELLED', 'Overlay was cancelled before completion.', {
          processed: i,
          total,
        }),
      );
    }

    const end = Math.min(i + chunkSize, baseRows.length);
    for (let j = i; j < end; j += 1) {
      const baseRow = baseRows[j]!;
      const matchIndexes = lookupOverlayMatches(
        joinIndex,
        baseRow,
        validated.joinBaseIndexes,
      );

      if (matchIndexes.length > 1) {
        return err(
          ambiguousMatchError(j, baseRow, validated.joinBaseIndexes, matchIndexes),
        );
      }

      let outRow: Row;
      if (matchIndexes.length === 0) {
        unmatched += 1;
        outRow = applyRulesToRow(baseRow, null, j, ctx, warnings);
      } else {
        matched += 1;
        outRow = applyRulesToRow(
          baseRow,
          overlaySheetRows[matchIndexes[0]!]!,
          j,
          ctx,
          warnings,
        );
      }
      outRows.push(outRow);
      observeDerivedRow(derivedTracker, outRow);
    }

    control.onProgress(end, total);
    if (end < baseRows.length) {
      await yieldBetween();
    }
  }

  if (total === 0) {
    emitFinal(0);
  }

  if (control.isCancelled()) {
    return err(
      createDiffError('CANCELLED', 'Overlay was cancelled before completion.', {
        processed: total,
        total,
      }),
    );
  }

  const meta: OverlayMeta = {
    totalBase: total,
    totalOverlay: joinIndex.totalOverlay,
    matched,
    unmatched,
    droppedByCompose: 0,
    rowWarnings: warnings,
  };

  const targetColumns = finalizeDerivedColumns(derivedTracker);
  const workbook = buildDerivedOverlayWorkbook(
    ctx.outputHeaders,
    outRows,
    validated.baseSheet.name,
    prepared.value.base.meta.filename,
    meta,
  );

  return ok({ workbook, summary: overlaySummaryFromMeta(meta, targetColumns) });
}

/**
 * Worker-oriented async entry: rules → finished result; fn → pairs (fn deferred).
 * Always emits final `(total, total)` progress when control is provided.
 */
export async function overlayWorkbooksAsyncForWorker(
  base: Workbook,
  overlay: Workbook,
  options: OverlayWorkbooksOptions,
  control?: DiffControl,
): Promise<Result<OverlayEngineOutcome, DiffError>> {
  if (options.schema.compose.kind === 'rules') {
    const result = await overlayWorkbooksAsync(base, overlay, options, control);
    if (!result.ok) {
      return result;
    }
    return ok({ kind: 'result', value: result.value });
  }

  // fn path: build pairs only (do not run fn in the Worker).
  if (control === undefined) {
    return overlayWorkbooksInternal(base, overlay, options, true);
  }

  const prepared = prepareOverlay(base, overlay, options);
  if (!prepared.ok) {
    return prepared;
  }

  const { validated, joinIndex } = prepared.value;
  const baseRows = validated.baseSheet.rows;
  const total = baseRows.length;
  const chunkSize = control.chunkSize ?? DEFAULT_OVERLAY_CHUNK_SIZE;
  const yieldBetween = control.yieldBetweenChunks ?? defaultYield;
  const overlaySheetRows = validated.overlaySheet.rows;
  const pairs: MatchedPair[] = [];
  let matched = 0;
  let unmatched = 0;

  for (let i = 0; i < baseRows.length; i += chunkSize) {
    if (control.isCancelled()) {
      return err(
        createDiffError('CANCELLED', 'Overlay was cancelled before completion.', {
          processed: i,
          total,
        }),
      );
    }

    const end = Math.min(i + chunkSize, baseRows.length);
    for (let j = i; j < end; j += 1) {
      const baseRow = baseRows[j]!;
      const matchIndexes = lookupOverlayMatches(
        joinIndex,
        baseRow,
        validated.joinBaseIndexes,
      );
      if (matchIndexes.length === 0) {
        unmatched += 1;
      } else {
        matched += 1;
      }
      pairs.push({
        baseRow,
        overlayRows: matchIndexes.map((idx) => overlaySheetRows[idx]!),
        baseRowIndex: j,
      });
    }

    control.onProgress(end, total);
    if (end < baseRows.length) {
      await yieldBetween();
    }
  }

  if (total === 0) {
    control.onProgress(0, 0);
  }

  if (control.isCancelled()) {
    return err(
      createDiffError('CANCELLED', 'Overlay was cancelled before completion.', {
        processed: total,
        total,
      }),
    );
  }

  return ok({
    kind: 'fn-pairs',
    value: {
      kind: 'fn-pairs',
      pairs,
      baseHeaders: validated.baseSheet.headers,
      overlayHeaders: validated.overlaySheet.headers,
      schema: validated.schema,
      summary: {
        totalBase: total,
        totalOverlay: joinIndex.totalOverlay,
        matched,
        unmatched,
      },
      sheetName: validated.baseSheet.name,
      baseFilename: prepared.value.base.meta.filename,
    },
  });
}
