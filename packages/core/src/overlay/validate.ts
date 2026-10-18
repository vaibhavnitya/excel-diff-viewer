import { createDiffError } from '../errors.js';
import { err, ok } from '../result.js';
import type {
  DiffError,
  OverlayRule,
  OverlaySchema,
  Result,
  Sheet,
} from '../types.js';
import { exactHeaderIndex, formatAvailableHeaders } from './header-index.js';

export type ResolvedRulesCompose = {
  readonly kind: 'rules';
  readonly rules: readonly OverlayRule[];
  /** Column indexes resolved at validation time for dense-array compose. */
  readonly resolved: readonly ResolvedRule[];
};

export type ResolvedRule =
  | {
      readonly op: 'add' | 'percentIncrease' | 'multiply';
      readonly baseIndex: number;
      readonly overlayIndex: number;
      readonly target: string;
      readonly defaultWhenMissing?: number;
    }
  | {
      readonly op: 'replace';
      readonly overlayIndex: number;
      readonly target: string;
    }
  | {
      readonly op: 'passthrough';
      readonly from: 'base' | 'overlay';
      readonly sourceIndex: number;
      readonly target: string;
    };

export type ResolvedFnCompose = {
  readonly kind: 'fn';
};

export type ValidatedOverlay = {
  readonly schema: OverlaySchema;
  readonly baseSheet: Sheet;
  readonly overlaySheet: Sheet;
  readonly joinBaseIndexes: readonly number[];
  readonly joinOverlayIndexes: readonly number[];
  readonly wildcardOnEmpty: 'overlay' | 'none';
  readonly passthroughIndexes: readonly number[];
  readonly passthroughHeaders: readonly string[];
  readonly compose: ResolvedRulesCompose | ResolvedFnCompose;
};

function missingHeaderError(
  column: string,
  role: string,
  sheet: Sheet,
  workbookLabel: string,
): DiffError {
  return createDiffError(
    'INVALID_SCHEMA',
    `INVALID_SCHEMA: ${role} '${column}' not found in ${workbookLabel} sheet '${sheet.name}'. Available headers: [${formatAvailableHeaders(sheet.headers)}].`,
    {
      field: column,
      sheet: sheet.name,
      availableHeaders: sheet.headers,
    },
  );
}

/**
 * Validate overlay schema against base/overlay sheets before any row walk.
 * Header lookups are exact string equality (no case folding).
 */
export function validateOverlaySchema(
  schema: OverlaySchema,
  baseSheet: Sheet,
  overlaySheet: Sheet,
  baseLabel = 'base workbook',
  overlayLabel = 'overlay workbook',
): Result<ValidatedOverlay, DiffError> {
  const joinBase = schema.join.base;
  const joinOverlay = schema.join.overlay;

  if (joinBase.length === 0 || joinOverlay.length === 0) {
    return err(
      createDiffError(
        'INVALID_SCHEMA',
        `INVALID_SCHEMA: Join columns must be non-empty. join.base has ${joinBase.length} column(s), join.overlay has ${joinOverlay.length}.`,
        { joinBaseLength: joinBase.length, joinOverlayLength: joinOverlay.length },
      ),
    );
  }

  if (joinBase.length !== joinOverlay.length) {
    return err(
      createDiffError(
        'INVALID_SCHEMA',
        `INVALID_SCHEMA: Join column counts must match. join.base has ${joinBase.length} column(s), join.overlay has ${joinOverlay.length}.`,
        { joinBaseLength: joinBase.length, joinOverlayLength: joinOverlay.length },
      ),
    );
  }

  const wildcardOnEmpty = schema.join.wildcardOnEmpty ?? 'overlay';
  if (wildcardOnEmpty !== 'overlay' && wildcardOnEmpty !== 'none') {
    return err(
      createDiffError(
        'INVALID_SCHEMA',
        `INVALID_SCHEMA: join.wildcardOnEmpty must be 'overlay' or 'none', got '${String(wildcardOnEmpty)}'.`,
        { wildcardOnEmpty },
      ),
    );
  }

  const joinBaseIndexes: number[] = [];
  for (const col of joinBase) {
    const idx = exactHeaderIndex(baseSheet.headers, col);
    if (idx < 0) {
      return err(missingHeaderError(col, 'Join column', baseSheet, baseLabel));
    }
    joinBaseIndexes.push(idx);
  }

  const joinOverlayIndexes: number[] = [];
  for (const col of joinOverlay) {
    const idx = exactHeaderIndex(overlaySheet.headers, col);
    if (idx < 0) {
      return err(missingHeaderError(col, 'Join column', overlaySheet, overlayLabel));
    }
    joinOverlayIndexes.push(idx);
  }

  let passthroughHeaders: readonly string[];
  let passthroughIndexes: number[];
  const passthrough = schema.passthrough ?? 'all';
  if (passthrough === 'all') {
    passthroughHeaders = baseSheet.headers;
    passthroughIndexes = baseSheet.headers.map((_, i) => i);
  } else {
    passthroughHeaders = passthrough;
    passthroughIndexes = [];
    for (const col of passthrough) {
      const idx = exactHeaderIndex(baseSheet.headers, col);
      if (idx < 0) {
        return err(
          missingHeaderError(col, 'Passthrough column', baseSheet, baseLabel),
        );
      }
      passthroughIndexes.push(idx);
    }
  }

  if (schema.compose.kind === 'fn') {
    return ok({
      schema,
      baseSheet,
      overlaySheet,
      joinBaseIndexes,
      joinOverlayIndexes,
      wildcardOnEmpty,
      passthroughIndexes,
      passthroughHeaders,
      compose: { kind: 'fn' },
    });
  }

  const rules = schema.compose.rules;
  const targets = new Set<string>();
  const resolved: ResolvedRule[] = [];

  for (const rule of rules) {
    if (rule.op === 'add' || rule.op === 'percentIncrease' || rule.op === 'multiply') {
      if (targets.has(rule.target)) {
        return err(
          createDiffError(
            'INVALID_SCHEMA',
            `INVALID_SCHEMA: Duplicate rule target '${rule.target}'. Each rule must write to a distinct target column.`,
            { target: rule.target },
          ),
        );
      }
      targets.add(rule.target);

      const baseIndex = exactHeaderIndex(baseSheet.headers, rule.base);
      if (baseIndex < 0) {
        return err(missingHeaderError(rule.base, 'Rule base column', baseSheet, baseLabel));
      }
      const overlayIndex = exactHeaderIndex(overlaySheet.headers, rule.overlay);
      if (overlayIndex < 0) {
        return err(
          missingHeaderError(rule.overlay, 'Rule overlay column', overlaySheet, overlayLabel),
        );
      }
      resolved.push({
        op: rule.op,
        baseIndex,
        overlayIndex,
        target: rule.target,
        defaultWhenMissing: rule.defaultWhenMissing,
      });
      continue;
    }

    if (rule.op === 'replace') {
      if (targets.has(rule.target)) {
        return err(
          createDiffError(
            'INVALID_SCHEMA',
            `INVALID_SCHEMA: Duplicate rule target '${rule.target}'. Each rule must write to a distinct target column.`,
            { target: rule.target },
          ),
        );
      }
      targets.add(rule.target);

      const overlayIndex = exactHeaderIndex(overlaySheet.headers, rule.overlay);
      if (overlayIndex < 0) {
        return err(
          missingHeaderError(rule.overlay, 'Rule overlay column', overlaySheet, overlayLabel),
        );
      }
      resolved.push({
        op: 'replace',
        overlayIndex,
        target: rule.target,
      });
      continue;
    }

    // passthrough
    const target = rule.target ?? rule.source;
    if (targets.has(target)) {
      return err(
        createDiffError(
          'INVALID_SCHEMA',
          `INVALID_SCHEMA: Duplicate rule target '${target}'. Each rule must write to a distinct target column.`,
          { target },
        ),
      );
    }
    targets.add(target);

    if (rule.from === 'base') {
      const sourceIndex = exactHeaderIndex(baseSheet.headers, rule.source);
      if (sourceIndex < 0) {
        return err(
          missingHeaderError(rule.source, 'Rule source column', baseSheet, baseLabel),
        );
      }
      resolved.push({
        op: 'passthrough',
        from: 'base',
        sourceIndex,
        target,
      });
    } else {
      const sourceIndex = exactHeaderIndex(overlaySheet.headers, rule.source);
      if (sourceIndex < 0) {
        return err(
          missingHeaderError(rule.source, 'Rule source column', overlaySheet, overlayLabel),
        );
      }
      resolved.push({
        op: 'passthrough',
        from: 'overlay',
        sourceIndex,
        target,
      });
    }
  }

  return ok({
    schema,
    baseSheet,
    overlaySheet,
    joinBaseIndexes,
    joinOverlayIndexes,
    wildcardOnEmpty,
    passthroughIndexes,
    passthroughHeaders,
    compose: { kind: 'rules', rules, resolved },
  });
}
