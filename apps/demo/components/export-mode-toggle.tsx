'use client';

import type { ExportMode } from '@mojro/excel-diff-ui';

type ExportModeToggleProps = {
  value: ExportMode;
  onChange: (mode: ExportMode) => void;
};

/** Demo-only control — not part of the library. */
export function ExportModeToggle({ value, onChange }: ExportModeToggleProps) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-muted-foreground">Export: current view / raw workbook</span>
      <select
        className="block rounded-md border bg-background px-3 py-2"
        value={value}
        onChange={(e) => {
          onChange(e.target.value as ExportMode);
        }}
      >
        <option value="current-view">current view</option>
        <option value="raw">raw workbook</option>
      </select>
    </label>
  );
}
