import { themeToCssVars } from '../theme-to-css-vars.js';
import { cx } from '../utils/cx.js';
import { FieldChangeCard } from './field-change-card.js';
import { StatTiles } from './stat-tiles.js';
import type { DiffSummaryProps } from './types.js';

/**
 * Presentational diff summary. Pass `diff.summary` from `useExcelDiff` /
 * `diffWorkbooks`. Row-level counts are fixed layout; field-change cards
 * render below. The `renderers` prop is reserved for column-treatment
 * cards when field aggregates expose column summaries in a later phase —
 * field-change cards use a dedicated layout today.
 */
export function DiffSummary({
  summary,
  theme,
  classNames,
  style,
  renderers: _renderers,
}: DiffSummaryProps) {
  void _renderers;

  return (
    <div
      className={cx('edv-summary', classNames?.root)}
      style={{ ...themeToCssVars(theme), ...style }}
      data-edv-component="diff-summary"
    >
      <header className={cx('edv-summary__header', classNames?.header)}>
        <h2 className="edv-summary__title">Diff summary</h2>
        <StatTiles
          tileClassName={classNames?.statTile}
          tiles={[
            { label: 'added', value: summary.added },
            { label: 'removed', value: summary.removed },
            { label: 'modified', value: summary.modified },
            { label: 'unchanged', value: summary.unchanged },
          ]}
        />
      </header>

      {summary.fieldChanges.length === 0 ? (
        <p className="edv-summary-empty">No field changes.</p>
      ) : (
        <div className="edv-summary__grid">
          {summary.fieldChanges.map((field) => (
            <FieldChangeCard
              key={field.field}
              field={field}
              className={classNames?.columnCard}
            />
          ))}
        </div>
      )}
    </div>
  );
}
