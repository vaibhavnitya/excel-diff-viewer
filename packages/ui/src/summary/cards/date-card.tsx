import type { DateColumnSummary } from '@mojro/excel-diff-core';
import type { ReactNode } from 'react';
import { ColumnCardFrame } from './column-card-frame.js';

type DateCardProps = {
  readonly column: DateColumnSummary;
  readonly className?: string;
  readonly visualization?: ReactNode;
};

export function DateCard({ column, className, visualization }: DateCardProps) {
  const defaultViz = (
    <div className="edv-summary-stats-row">
      <span>
        <em>min</em> {column.min ?? '—'}
      </span>
      <span>
        <em>max</em> {column.max ?? '—'}
      </span>
    </div>
  );

  return (
    <ColumnCardFrame
      title={column.column}
      count={column.count}
      nullCount={column.nullCount}
      className={className}
      footer={
        <span className="edv-summary-card__stat">
          distinct {column.distinctCount}
        </span>
      }
    >
      {visualization ?? defaultViz}
    </ColumnCardFrame>
  );
}
