import type { BooleanColumnSummary } from '@mojro/excel-diff-core';
import type { ReactNode } from 'react';
import { ColumnCardFrame } from './column-card-frame.js';

type BooleanCardProps = {
  readonly column: BooleanColumnSummary;
  readonly className?: string;
  readonly visualization?: ReactNode;
};

export function BooleanCard({
  column,
  className,
  visualization,
}: BooleanCardProps) {
  const total = column.trueCount + column.falseCount;
  const truePct = total === 0 ? 50 : (column.trueCount / total) * 100;
  const falsePct = total === 0 ? 50 : (column.falseCount / total) * 100;

  const defaultViz = (
    <>
      <div
        className="edv-summary-bool-bar"
        role="img"
        aria-label={`true ${column.trueCount}, false ${column.falseCount}`}
      >
        <div
          className="edv-summary-bool-bar__true"
          style={{ width: `${truePct}%` }}
        />
        <div
          className="edv-summary-bool-bar__false"
          style={{ width: `${falsePct}%` }}
        />
      </div>
      <div className="edv-summary-stats-row">
        <span>
          <em>true</em> {column.trueCount}
        </span>
        <span>
          <em>false</em> {column.falseCount}
        </span>
      </div>
    </>
  );

  return (
    <ColumnCardFrame
      title={column.column}
      count={column.count}
      nullCount={column.nullCount}
      className={className}
    >
      {visualization ?? defaultViz}
    </ColumnCardFrame>
  );
}
