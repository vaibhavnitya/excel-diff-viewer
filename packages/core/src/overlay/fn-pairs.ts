import type {
  ColumnSummary,
  ComposeFn,
  NamedRow,
  OverlaySchema,
  OverlaySummary,
  Row,
} from '../types.js';
import {
  createFnDerivedTracker,
  finalizeDerivedColumns,
  observeDerivedRow,
} from '../summary/derived-columns.js';
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
  readonly summary: Omit<OverlaySummary, 'droppedByCompose' | 'targetColumns'>;
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
 * Materialize dense rows + derived-column summaries from named fn results.
 * Shared by the Node assemble path and (via public export shape) consumers
 * that already hold named results.
 */
export function materializeFnOverlay(
  namedResults: readonly (NamedRow | null)[],
  baseHeaders: readonly string[],
): {
  readonly headers: readonly string[];
  readonly rows: readonly Row[];
  readonly targetColumns: readonly ColumnSummary[];
} {
  const headers = collectFnColumnUnion(baseHeaders, namedResults);
  const tracker = createFnDerivedTracker(headers, baseHeaders);
  const rows: Row[] = [];
  for (const named of namedResults) {
    if (named === null) {
      continue;
    }
    const dense = namedToDense(named, headers);
    rows.push(dense);
    observeDerivedRow(tracker, dense);
  }
  return {
    headers,
    rows,
    targetColumns: finalizeDerivedColumns(tracker),
  };
}

/**
 * Run `ComposeFn` over matched pairs with a two-pass column union.
 * Stats for derived columns accumulate in the dense-emission pass (one fn call
 * pass — not two).
 */
export function assembleFnOverlay(
  pairs: readonly MatchedPair[],
  fn: ComposeFn,
  baseHeaders: readonly string[],
  overlayHeaders: readonly string[],
  sheetName: string,
  baseFilename: string | undefined,
  partialSummary: Omit<OverlaySummary, 'droppedByCompose' | 'targetColumns'>,
  control?: FnComposeControl,
): {
  readonly headers: readonly string[];
  readonly rows: readonly Row[];
  readonly droppedByCompose: number;
  readonly cancelled: boolean;
  readonly targetColumns: readonly ColumnSummary[];
} {
  const total = pairs.length;
  const chunkSize = control?.chunkSize ?? DEFAULT_FN_CHUNK;
  const namedResults: (NamedRow | null)[] = new Array(total);
  let droppedByCompose = 0;

  for (let i = 0; i < total; i += 1) {
    if (control?.isCancelled?.()) {
      return {
        headers: baseHeaders,
        rows: [],
        droppedByCompose,
        cancelled: true,
        targetColumns: [],
      };
    }

    const pair = pairs[i]!;
    const baseNamed = rowToNamed(pair.baseRow, baseHeaders);
    const overlayNamed = pair.overlayRows.map((r) => rowToNamed(r, overlayHeaders));
    const result = fn(baseNamed, overlayNamed);
    namedResults[i] = result;
    if (result === null) {
      droppedByCompose += 1;
    }

    void baseNamed;
    void overlayNamed;

    if ((i + 1) % chunkSize === 0 || i + 1 === total) {
      control?.onProgress?.(i + 1, total);
    }
  }

  const materialized = materializeFnOverlay(namedResults, baseHeaders);

  void sheetName;
  void baseFilename;
  void partialSummary;

  return {
    headers: materialized.headers,
    rows: materialized.rows,
    droppedByCompose,
    cancelled: false,
    targetColumns: materialized.targetColumns,
  };
}
