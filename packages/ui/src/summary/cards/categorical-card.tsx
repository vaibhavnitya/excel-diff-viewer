import type { CategoricalColumnSummary } from '@mojro/excel-diff-core';
import type { ReactNode } from 'react';
import { ColumnCardFrame } from './column-card-frame.js';

type CategoricalCardProps = {
  readonly column: CategoricalColumnSummary;
  readonly className?: string;
  readonly visualization?: ReactNode;
};

export function CategoricalCard({
  column,
  className,
  visualization,
}: CategoricalCardProps) {
  const maxCount = column.topValues.reduce(
    (m, v) => Math.max(m, v.count),
    0,
  );

  const defaultViz =
    column.topValues.length === 0 ? (
      <p className="edv-summary-empty">No values</p>
    ) : (
      <ul className="edv-summary-bars">
        {column.topValues.map((entry) => {
          const pct =
            maxCount === 0 ? 0 : (entry.count / maxCount) * 100;
          return (
            <li key={entry.value} className="edv-summary-bars__item">
              <div className="edv-summary-bars__label">
                <span className="edv-summary-bars__value">
                  {entry.value === '' ? '(blank)' : entry.value}
                </span>
                <span className="edv-summary-bars__count">{entry.count}</span>
              </div>
              <div className="edv-summary-bars__track">
                <div
                  className="edv-summary-bars__fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    );

  const footer = (
    <>
      <span className="edv-summary-card__stat">
        distinct {column.distinctCount}
      </span>
      {column.blankCount > 0 ? (
        <span className="edv-summary-card__stat">
          blank {column.blankCount}
        </span>
      ) : null}
    </>
  );

  return (
    <ColumnCardFrame
      title={column.column}
      count={column.count}
      nullCount={column.nullCount}
      className={className}
      footer={footer}
    >
      {visualization ?? defaultViz}
    </ColumnCardFrame>
  );
}
