import type { DiffStats } from '@mojro/excel-diff-core';
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
  enableXlsxExport?: boolean;
  onExportXlsx?: () => void;
  exporting?: boolean;
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
  enableXlsxExport = false,
  onExportXlsx,
  exporting = false,
  extra,
}: ToolbarProps) {
  const showDownload =
    (enableCSVExport && onExportCSV !== undefined) ||
    (enableXlsxExport && onExportXlsx !== undefined);

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
        {showDownload ? (
          <>
            {enableCSVExport && onExportCSV !== undefined ? (
              <button
                type="button"
                onClick={onExportCSV}
                disabled={exporting}
              >
                Download CSV
              </button>
            ) : null}
            {enableXlsxExport && onExportXlsx !== undefined ? (
              <button
                type="button"
                onClick={onExportXlsx}
                disabled={exporting}
                aria-busy={exporting || undefined}
              >
                {exporting ? 'Exporting…' : 'Download XLSX'}
              </button>
            ) : null}
          </>
        ) : null}
        {extra}
      </div>
    </div>
  );
}
