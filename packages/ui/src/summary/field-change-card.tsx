import type { FieldChangeAggregate } from '@mojro/excel-diff-core';
import { ColumnCardFrame } from './cards/column-card-frame.js';

type FieldChangeCardProps = {
  readonly field: FieldChangeAggregate;
  readonly className?: string;
};

/**
 * Diff field-change aggregate card.
 * Numeric and/or categorical sections depending on what the engine populated.
 */
export function FieldChangeCard({ field, className }: FieldChangeCardProps) {
  const numeric = field.numericChanges;
  const categorical = field.categoricalChanges;

  return (
    <ColumnCardFrame
      title={field.field}
      className={className}
      footer={
        <span className="edv-summary-card__stat">
          changed rows {field.changedRows}
        </span>
      }
    >
      {numeric !== null ? (
        <div className="edv-summary-stats-row" data-edv-field-kind="numeric">
          <span>
            <em>mean Δ</em> {numeric.meanDelta}
          </span>
          <span>
            <em>|mean Δ|</em> {numeric.meanAbsDelta}
          </span>
          <span>
            <em>max |Δ|</em> {numeric.maxAbsDelta}
          </span>
          <span>
            <em>↑</em> {numeric.increased}
          </span>
          <span>
            <em>↓</em> {numeric.decreased}
          </span>
        </div>
      ) : null}

      {categorical !== null ? (
        <ul
          className="edv-summary-bars"
          data-edv-field-kind="categorical"
        >
          {categorical.topTransitions.map(
            (t: {
              readonly from: string;
              readonly to: string;
              readonly count: number;
            }) => (
              <li
                key={`${t.from}→${t.to}`}
                className="edv-summary-bars__item"
              >
                <div className="edv-summary-bars__label">
                  <span className="edv-summary-bars__value">
                    {t.from} → {t.to}
                  </span>
                  <span className="edv-summary-bars__count">{t.count}</span>
                </div>
              </li>
            ),
          )}
        </ul>
      ) : null}

      {numeric === null && categorical === null ? (
        <p className="edv-summary-empty">No change aggregates</p>
      ) : null}
    </ColumnCardFrame>
  );
}
