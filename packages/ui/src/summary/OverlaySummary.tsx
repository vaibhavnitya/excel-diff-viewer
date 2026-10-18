import { themeToCssVars } from '../theme-to-css-vars.js';
import { cx } from '../utils/cx.js';
import { ColumnCard } from './cards/column-card.js';
import { StatTiles } from './stat-tiles.js';
import type { OverlaySummaryProps } from './types.js';

/**
 * Presentational overlay summary. Pass `result.summary` from
 * `useExcelOverlay` / `overlayWorkbooks`. Row-level counts are fixed;
 * `targetColumns` render as standard treatment cards (honoring `renderers`).
 */
export function OverlaySummary({
  summary,
  theme,
  classNames,
  style,
  renderers,
}: OverlaySummaryProps) {
  return (
    <div
      className={cx('edv-summary', classNames?.root)}
      style={{ ...themeToCssVars(theme), ...style }}
      data-edv-component="overlay-summary"
    >
      <header className={cx('edv-summary__header', classNames?.header)}>
        <h2 className="edv-summary__title">Overlay summary</h2>
        <StatTiles
          tileClassName={classNames?.statTile}
          tiles={[
            { label: 'base', value: summary.totalBase },
            { label: 'overlay', value: summary.totalOverlay },
            { label: 'matched', value: summary.matched },
            { label: 'unmatched', value: summary.unmatched },
            { label: 'dropped', value: summary.droppedByCompose },
          ]}
        />
      </header>

      {summary.targetColumns.length === 0 ? (
        <p className="edv-summary-empty">No derived columns.</p>
      ) : (
        <div className="edv-summary__grid">
          {summary.targetColumns.map((col) => (
            <ColumnCard
              key={col.column}
              column={col}
              className={classNames?.columnCard}
              renderers={renderers}
            />
          ))}
        </div>
      )}
    </div>
  );
}
