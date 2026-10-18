import type { CSSProperties, ReactNode } from 'react';
import type {
  BooleanColumnSummary,
  CategoricalColumnSummary,
  DateColumnSummary,
  DiffSummary as DiffSummaryData,
  NumericColumnSummary,
  OverlaySummary as OverlaySummaryData,
  WorkbookSummary as WorkbookSummaryData,
} from '@mojro/excel-diff-core';
import type { Theme } from '../theme.js';

export type SummaryClassNames = {
  readonly root?: string;
  readonly header?: string;
  readonly columnCard?: string;
  readonly statTile?: string;
};

/**
 * Per-treatment visualization overrides.
 * The library wraps the returned node in the default card frame
 * (title + count / nullCount). Only the visualization slot is replaced.
 */
export type SummaryRenderers = {
  readonly numeric?: (column: NumericColumnSummary) => ReactNode;
  readonly categorical?: (column: CategoricalColumnSummary) => ReactNode;
  readonly date?: (column: DateColumnSummary) => ReactNode;
  readonly boolean?: (column: BooleanColumnSummary) => ReactNode;
};

export type CommonSummaryProps = {
  readonly theme?: Theme;
  readonly classNames?: SummaryClassNames;
  readonly style?: CSSProperties;
  readonly renderers?: SummaryRenderers;
};

export type WorkbookSummaryProps = CommonSummaryProps & {
  readonly summary: WorkbookSummaryData;
};

export type DiffSummaryProps = CommonSummaryProps & {
  readonly summary: DiffSummaryData;
};

export type OverlaySummaryProps = CommonSummaryProps & {
  readonly summary: OverlaySummaryData;
};
