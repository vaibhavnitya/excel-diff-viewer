import type {
  ComposeFn,
  NamedRow,
  OverlaySchema,
  OverlaySummary,
  Row,
} from '../types.js';
import {
  collectFnColumnUnion,
  namedToDense,
  rowToNamed,
} from './named-row.js';

/** One base row paired with all matching overlay rows (dense storage). */
export type MatchedPair = {
  readonly baseRow: Row;
  readonly overlayRows: readonly Row[];
  /** 0-based data-row index in the base sheet. */
  readonly baseRowIndex: number;
};

/**
 * Intermediate result when `compose.kind === 'fn'` and the caller defers
 * running `fn` (Worker → main-thread path). Not exported from the public barrel.
 */
export type OverlayFnPairsResult = {
  readonly kind: 'fn-pairs';
  readonly pairs: readonly MatchedPair[];
  readonly baseHeaders: readonly string[];
  readonly overlayHeaders: readonly string[];
  readonly schema: OverlaySchema;
  readonly summary: Omit<OverlaySummary, 'droppedByCompose'>;
  readonly sheetName: string;
  readonly baseFilename: string | undefined;
};

export type FnComposeControl = {
  readonly isCancelled?: () => boolean;
  readonly onProgress?: (processed: number, total: number) => void;
  readonly chunkSize?: number;
};

const DEFAULT_FN_CHUNK = 1000;

/**
 * Run `ComposeFn` over matched pairs with a two-pass column union.
 * Used by the Node/direct-call path (inline) and by the react chunked utility.
 */
export function assembleFnOverlay(
  pairs: readonly MatchedPair[],
  fn: ComposeFn,
  baseHeaders: readonly string[],
  overlayHeaders: readonly string[],
  sheetName: string,
  baseFilename: string | undefined,
  partialSummary: Omit<OverlaySummary, 'droppedByCompose'>,
  control?: FnComposeControl,
): {
  readonly headers: readonly string[];
  readonly rows: readonly Row[];
  readonly droppedByCompose: number;
  readonly cancelled: boolean;
} {
  const total = pairs.length;
  const chunkSize = control?.chunkSize ?? DEFAULT_FN_CHUNK;
  const namedResults: (NamedRow | null)[] = new Array(total);
  let droppedByCompose = 0;

  for (let i = 0; i < total; i += 1) {
    if (control?.isCancelled?.()) {
      return { headers: baseHeaders, rows: [], droppedByCompose, cancelled: true };
    }

    const pair = pairs[i]!;
    const baseNamed = rowToNamed(pair.baseRow, baseHeaders);
    const overlayNamed = pair.overlayRows.map((r) => rowToNamed(r, overlayHeaders));
    const result = fn(baseNamed, overlayNamed);
    namedResults[i] = result;
    if (result === null) {
      droppedByCompose += 1;
    }

    // Release named views promptly (locals go out of scope each iteration).
    void baseNamed;
    void overlayNamed;

    if ((i + 1) % chunkSize === 0 || i + 1 === total) {
      control?.onProgress?.(i + 1, total);
    }
  }

  const headers = collectFnColumnUnion(baseHeaders, namedResults);
  const rows: Row[] = [];
  for (const named of namedResults) {
    if (named === null) {
      continue;
    }
    rows.push(namedToDense(named, headers));
  }

  void sheetName;
  void baseFilename;
  void partialSummary;

  return { headers, rows, droppedByCompose, cancelled: false };
}
