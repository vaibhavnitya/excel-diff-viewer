import type { CellValue, Row, RowWarning } from '../types.js';
import type { ResolvedRule } from './validate.js';

const MAX_ROW_WARNINGS = 100;

function asNumber(value: CellValue): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function isEmptyOverlayCell(value: CellValue | undefined): boolean {
  return value === undefined || value === null || value === '';
}

export type RulesComposeContext = {
  readonly resolved: readonly ResolvedRule[];
  /** Output header list: passthrough headers then new targets in rule order. */
  readonly outputHeaders: readonly string[];
  /** Map from target name → column index in the output row. */
  readonly targetIndexByName: ReadonlyMap<string, number>;
  readonly passthroughIndexes: readonly number[];
  readonly passthroughHeaderCount: number;
};

export function buildRulesComposeContext(
  passthroughHeaders: readonly string[],
  passthroughIndexes: readonly number[],
  resolved: readonly ResolvedRule[],
): RulesComposeContext {
  const outputHeaders: string[] = [...passthroughHeaders];
  const targetIndexByName = new Map<string, number>();

  for (let i = 0; i < passthroughHeaders.length; i += 1) {
    targetIndexByName.set(passthroughHeaders[i]!, i);
  }

  for (const rule of resolved) {
    const existing = targetIndexByName.get(rule.target);
    if (existing === undefined) {
      targetIndexByName.set(rule.target, outputHeaders.length);
      outputHeaders.push(rule.target);
    }
  }

  return {
    resolved,
    outputHeaders,
    targetIndexByName,
    passthroughIndexes,
    passthroughHeaderCount: passthroughHeaders.length,
  };
}

/**
 * Apply rules to one base row + 0-or-1 overlay row.
 * Mutates `warnings` (capped at 100). Returns a dense output row.
 */
export function applyRulesToRow(
  baseRow: Row,
  overlayRow: Row | null,
  baseRowIndex: number,
  ctx: RulesComposeContext,
  warnings: RowWarning[],
): Row {
  const out: CellValue[] = new Array(ctx.outputHeaders.length).fill(null);

  for (let i = 0; i < ctx.passthroughIndexes.length; i += 1) {
    const src = ctx.passthroughIndexes[i]!;
    out[i] = baseRow[src] ?? null;
  }

  for (const rule of ctx.resolved) {
    // Targets are registered in buildRulesComposeContext; missing = programming error.
    const targetIndex = ctx.targetIndexByName.get(rule.target)!;

    if (rule.op === 'passthrough') {
      if (rule.from === 'base') {
        out[targetIndex] = baseRow[rule.sourceIndex] ?? null;
      } else if (overlayRow !== null) {
        out[targetIndex] = overlayRow[rule.sourceIndex] ?? null;
      } else {
        out[targetIndex] = null;
      }
      continue;
    }

    if (rule.op === 'replace') {
      if (overlayRow === null || isEmptyOverlayCell(overlayRow[rule.overlayIndex])) {
        out[targetIndex] = null;
      } else {
        // Non-empty after isEmptyOverlayCell — value is defined.
        out[targetIndex] = overlayRow[rule.overlayIndex] as CellValue;
      }
      continue;
    }

    // numeric ops: add | percentIncrease | multiply
    const baseRaw = baseRow[rule.baseIndex] ?? null;
    const baseNum = asNumber(baseRaw);

    if (baseNum === null && baseRaw !== null && baseRaw !== '') {
      out[targetIndex] = null;
      if (warnings.length < MAX_ROW_WARNINGS) {
        warnings.push({
          baseRowIndex,
          target: rule.target,
          message: `Non-numeric base value for op '${rule.op}' on target '${rule.target}' at base row ${baseRowIndex}.`,
        });
      }
      continue;
    }

    if (baseNum === null) {
      out[targetIndex] = null;
      continue;
    }

    let overlayNum: number | null = null;
    if (overlayRow !== null && !isEmptyOverlayCell(overlayRow[rule.overlayIndex])) {
      overlayNum = asNumber(overlayRow[rule.overlayIndex] as CellValue);
      if (overlayNum === null) {
        out[targetIndex] = null;
        if (warnings.length < MAX_ROW_WARNINGS) {
          warnings.push({
            baseRowIndex,
            target: rule.target,
            message: `Non-numeric overlay value for op '${rule.op}' on target '${rule.target}' at base row ${baseRowIndex}.`,
          });
        }
        continue;
      }
    } else if (rule.defaultWhenMissing !== undefined) {
      overlayNum = rule.defaultWhenMissing;
    } else {
      out[targetIndex] = null;
      continue;
    }

    if (rule.op === 'add') {
      out[targetIndex] = baseNum + overlayNum;
    } else if (rule.op === 'percentIncrease') {
      out[targetIndex] = baseNum * (1 + overlayNum / 100);
    } else {
      // multiply
      out[targetIndex] = baseNum * overlayNum;
    }
  }

  return out;
}

export { MAX_ROW_WARNINGS };
