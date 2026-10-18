import type {
  DiffError,
  DiffResult,
  FileFormat,
  Limits,
  OverlaySummary,
  OverlayWorkbooksOptions,
  Workbook,
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

export type { OverlayWorkbooksOptions };
