import type { DiffStats } from '@your-scope/excel-diff-core';
import type { ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export type ToolbarProps = {
  className?: string;
  stats?: DiffStats;
  showOnlyChanges?: boolean;
  onShowOnlyChangesChange?: (value: boolean) => void;
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  enableCSVExport?: boolean;
  onExportCSV?: () => void;
  extra?: ReactNode;
};

export function Toolbar({
  className,
  stats,
  showOnlyChanges,
  onShowOnlyChangesChange,
  searchQuery,
  onSearchQueryChange,
  enableCSVExport = false,
  onExportCSV,
  extra,
}: ToolbarProps) {
  return (
    <div className={cx('edv-toolbar', className)}>
      {stats !== undefined ? (
        <div className="edv-toolbar__stats" data-edv-stats>
          <span>Added {stats.added}</span>
          <span>Removed {stats.removed}</span>
          <span>Modified {stats.modified}</span>
          <span>Unchanged {stats.unchanged}</span>
        </div>
      ) : null}
      <div className="edv-toolbar__controls">
        {onShowOnlyChangesChange !== undefined ? (
          <label>
            <input
              type="checkbox"
              checked={showOnlyChanges === true}
              onChange={(event) => {
                onShowOnlyChangesChange(event.target.checked);
              }}
            />
            Show only changes
          </label>
        ) : null}
        {onSearchQueryChange !== undefined ? (
          <input
            type="search"
            placeholder="Search…"
            value={searchQuery ?? ''}
            onChange={(event) => {
              onSearchQueryChange(event.target.value);
            }}
            aria-label="Search diff"
          />
        ) : null}
        {enableCSVExport && onExportCSV !== undefined ? (
          <button type="button" onClick={onExportCSV}>
            Download CSV
          </button>
        ) : null}
        {extra}
      </div>
    </div>
  );
}
