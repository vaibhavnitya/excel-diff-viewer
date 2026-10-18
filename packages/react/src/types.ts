import type {
  DiffError,
  DiffResult,
  FileFormat,
  Limits,
  OverlaySummary,
  OverlayWorkbooksOptions,
  SummaryCache,
  SummaryConfig,
  Workbook,
  WorkbookSummary,
} from '@mojro/excel-diff-core';

export type FileState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading'; readonly progress: number }
  | { readonly status: 'success'; readonly workbook: Workbook }
  | { readonly status: 'error'; readonly error: DiffError };

export type DiffPhase = 'parsing-a' | 'parsing-b' | 'diffing';

export type DiffState =
  | { readonly status: 'idle' }
  | {
      readonly status: 'loading';
      readonly progress: number;
      readonly phase: DiffPhase;
    }
  | {
      readonly status: 'success';
      readonly diff: DiffResult;
      readonly workbookA: Workbook;
      readonly workbookB: Workbook;
    }
  | { readonly status: 'error'; readonly error: DiffError };

export type OverlayPhase =
  | 'parsing-base'
  | 'parsing-overlay'
  | 'overlaying'
  | 'composing';

/**
 * Discriminated overlay state — mirrors {@link DiffState}.
 * `summary` appears only on success (like `diff` on DiffState).
 */
export type OverlayState =
  | { readonly status: 'idle' }
  | {
      readonly status: 'loading';
      readonly progress: number;
      readonly phase: OverlayPhase;
    }
  | {
      readonly status: 'success';
      readonly workbook: Workbook;
      readonly summary: OverlaySummary;
      readonly workbookBase: Workbook;
      readonly workbookOverlay: Workbook;
    }
  | { readonly status: 'error'; readonly error: DiffError };

/** Options for `useExcelFile` — mirrors core `ParseFileOptions`. */
export type UseExcelFileOptions = {
  readonly filename?: string;
  readonly format?: FileFormat;
  readonly limits?: Partial<Limits>;
};

/**
 * Options for `useExcelDiff`.
 * `schema` is a hook argument (not nested here). Parse options apply to both files.
 */
export type UseExcelDiffOptions = {
  readonly filenameA?: string;
  readonly filenameB?: string;
  readonly formatA?: FileFormat;
  readonly formatB?: FileFormat;
  readonly limits?: Partial<Limits>;
};

/**
 * Parse/filename options for `useExcelOverlay`.
 * Overlay schema + sheet/limits live in the `options` hook argument
 * ({@link OverlayWorkbooksOptions}).
 */
export type UseExcelOverlayOptions = {
  readonly filenameBase?: string;
  readonly filenameOverlay?: string;
  readonly formatBase?: FileFormat;
  readonly formatOverlay?: FileFormat;
  readonly limits?: Partial<Limits>;
};

/**
 * Progress for {@link useWorkbookSummary} async path.
 * Mirrors core `DiffControl.onProgress(processed, total)` cell counts.
 */
export type SummaryProgress = {
  readonly processed: number;
  readonly total: number;
};

/**
 * Discriminated workbook-summary state — mirrors {@link DiffState}.
 * Sync path never enters `loading`; async path reports {@link SummaryProgress}.
 */
export type UseWorkbookSummaryState =
  | { readonly status: 'idle' }
  | {
      readonly status: 'loading';
      readonly progress: SummaryProgress;
    }
  | {
      readonly status: 'success';
      readonly summary: WorkbookSummary;
    }
  | { readonly status: 'error'; readonly error: DiffError };

/**
 * Options for `useWorkbookSummary`.
 *
 * **Sync vs async:** default is sync (`async` omitted / `false`). Sync is fine
 * up to the 100k-row workbook limit (~200ms measured). Pass `async: true` when
 * main-thread blocking matters.
 *
 * **Cache:** omit `cache` to get a per-hook-instance cache (GC'd on unmount).
 * Pass an external {@link SummaryCache} to share hits across hooks.
 */
export type UseWorkbookSummaryOptions = {
  readonly cache?: SummaryCache;
  /** Default `false`. When `true`, uses `summarizeWorkbookAsync` with cancellation. */
  readonly async?: boolean;
};

export type { OverlayWorkbooksOptions, SummaryCache, SummaryConfig };
