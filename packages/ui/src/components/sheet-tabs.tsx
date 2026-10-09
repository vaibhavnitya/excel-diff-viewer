import { cx } from '../utils/cx.js';

export type SheetTabsProps = {
  sheets: readonly string[];
  activeSheet: string;
  loadingSheet?: string | null;
  onSheetChange: (sheetName: string) => void;
  className?: string;
};

export function SheetTabs({
  sheets,
  activeSheet,
  loadingSheet = null,
  onSheetChange,
  className,
}: SheetTabsProps) {
  if (sheets.length <= 1) {
    return null;
  }

  return (
    <div className={cx('edv-sheet-tabs', className)} role="tablist" aria-label="Sheets">
      {sheets.map((name) => {
        const selected = name === activeSheet;
        const loading = name === loadingSheet;
        return (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={selected}
            className="edv-sheet-tab"
            onClick={() => {
              onSheetChange(name);
            }}
          >
            {name}
            {loading ? <span className="edv-sheet-tab__loading">…</span> : null}
          </button>
        );
      })}
    </div>
  );
}
