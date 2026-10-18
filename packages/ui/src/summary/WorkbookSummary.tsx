import type { ColumnSummary } from '@mojro/excel-diff-core';
import { themeToCssVars } from '../theme-to-css-vars.js';
import { cx } from '../utils/cx.js';
import { ColumnCard } from './cards/column-card.js';
import { StatTiles } from './stat-tiles.js';
import type { WorkbookSummaryProps } from './types.js';

/**
 * Presentational workbook summary. Pass an already-computed
 * `WorkbookSummary` from `useWorkbookSummary` or `summarizeWorkbook`.
 * The component does not fetch or compute.
 */
export function WorkbookSummary({
  summary,
  theme,
  classNames,
  style,
  renderers,
}: WorkbookSummaryProps) {
  return (
    <div
      className={cx('edv-summary', classNames?.root)}
      style={{ ...themeToCssVars(theme), ...style }}
      data-edv-component="workbook-summary"
    >
      <header className={cx('edv-summary__header', classNames?.header)}>
        <h2 className="edv-summary__title">Workbook summary</h2>
        <StatTiles
          tileClassName={classNames?.statTile}
          tiles={[
            { label: 'rows', value: summary.rowCount },
            { label: 'columns', value: summary.columnCount },
            { label: 'sheet', value: summary.sheetName },
          ]}
        />
      </header>

      {summary.columns.length === 0 ? (
        <p className="edv-summary-empty">No columns to summarize.</p>
      ) : (
        <div className="edv-summary__grid">
          {summary.columns.map((col: ColumnSummary) => (
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
