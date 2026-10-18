import type { NumericColumnSummary } from '@mojro/excel-diff-core';
import type { ReactNode } from 'react';
import { ColumnCardFrame } from './column-card-frame.js';

type NumericCardProps = {
  readonly column: NumericColumnSummary;
  readonly className?: string;
  /** When set, replaces the default visualization slot. */
  readonly visualization?: ReactNode;
};

function formatNum(n: number | null): string {
  if (n === null) return '—';
  if (Number.isInteger(n)) return String(n);
  return n.toPrecision(6).replace(/\.?0+$/, '');
}

function RangeIndicator({
  min,
  mean,
  max,
}: {
  readonly min: number;
  readonly mean: number;
  readonly max: number;
}) {
  const span = max - min;
  const meanPct = span === 0 ? 50 : ((mean - min) / span) * 100;

  return (
    <div
      className="edv-summary-range"
      role="img"
      aria-label={`Range ${min} to ${max}, mean ${mean}`}
    >
      <div className="edv-summary-range__track" />
      <div
        className="edv-summary-range__mark edv-summary-range__mark--min"
        style={{ left: '0%' }}
      />
      <div
        className="edv-summary-range__mark edv-summary-range__mark--mean"
        style={{ left: `${meanPct}%` }}
      />
      <div
        className="edv-summary-range__mark edv-summary-range__mark--max"
        style={{ left: '100%' }}
      />
    </div>
  );
}

export function NumericCard({
  column,
  className,
  visualization,
}: NumericCardProps) {
  const defaultViz =
    column.min !== null && column.max !== null && column.mean !== null ? (
      <>
        <div className="edv-summary-stats-row">
          <span>
            <em>min</em> {formatNum(column.min)}
          </span>
          <span>
            <em>max</em> {formatNum(column.max)}
          </span>
          <span>
            <em>mean</em> {formatNum(column.mean)}
          </span>
          <span>
            <em>median</em> {formatNum(column.median)}
          </span>
        </div>
        <RangeIndicator min={column.min} mean={column.mean} max={column.max} />
      </>
    ) : (
      <p className="edv-summary-empty">No numeric values</p>
    );

  const footer = (
    <>
      {column.stddev !== null ? (
        <span className="edv-summary-card__stat">
          stddev {formatNum(column.stddev)}
        </span>
      ) : null}
      <span className="edv-summary-card__stat">
        distinct {column.distinctCount}
      </span>
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
