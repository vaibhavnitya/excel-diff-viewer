import type { ColumnSummary } from '@mojro/excel-diff-core';
import type { SummaryRenderers } from '../types.js';
import { BooleanCard } from './boolean-card.js';
import { CategoricalCard } from './categorical-card.js';
import { DateCard } from './date-card.js';
import { NumericCard } from './numeric-card.js';

type ColumnCardProps = {
  readonly column: ColumnSummary;
  readonly className?: string;
  readonly renderers?: SummaryRenderers;
};

/** Dispatch a {@link ColumnSummary} to the matching treatment card. */
export function ColumnCard({ column, className, renderers }: ColumnCardProps) {
  switch (column.treatment) {
    case 'numeric':
      return (
        <NumericCard
          column={column}
          className={className}
          visualization={renderers?.numeric?.(column)}
        />
      );
    case 'categorical':
      return (
        <CategoricalCard
          column={column}
          className={className}
          visualization={renderers?.categorical?.(column)}
        />
      );
    case 'date':
      return (
        <DateCard
          column={column}
          className={className}
          visualization={renderers?.date?.(column)}
        />
      );
    case 'boolean':
      return (
        <BooleanCard
          column={column}
          className={className}
          visualization={renderers?.boolean?.(column)}
        />
      );
    default: {
      const _exhaustive: never = column;
      return _exhaustive;
    }
  }
}
