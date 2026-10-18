import { describe, expect, it } from 'vitest';
import {
  diffRowsToWorkbook,
  EDIT_STATUS_COLUMN,
} from '../src/export/diff-to-workbook.js';
import {
  diffExportFilename,
  overlayExportFilename,
  splitExportFilename,
  viewerExportFilename,
} from '../src/export/filenames.js';
import { splitDiffToWorkbook } from '../src/export/split-to-workbook.js';
import { diffResult } from './fixtures.js';

describe('export filenames', () => {
  it('builds viewer / diff / overlay / split names', () => {
    expect(viewerExportFilename('rates.xlsx')).toBe('rates-export.xlsx');
    expect(viewerExportFilename(undefined)).toBe('export.xlsx');
    expect(diffExportFilename('a.xlsx', 'b.xlsx')).toBe('diff-a-vs-b.xlsx');
    expect(diffExportFilename(undefined, undefined)).toBe('diff.xlsx');
    expect(overlayExportFilename('base.xlsx')).toBe('overlay-base.xlsx');
    expect(overlayExportFilename(undefined)).toBe('overlay.xlsx');
    expect(splitExportFilename('a.xlsx', 'b.xlsx')).toBe('split-a-vs-b.xlsx');
    expect(splitExportFilename(undefined, undefined)).toBe('split.xlsx');
  });
});

describe('diffRowsToWorkbook', () => {
  it('appends Edit Status as last column with correct values', () => {
    const diff = diffResult();
    const wb = diffRowsToWorkbook(diff, diff.rows);
    const sheet = wb.sheets[0]!;
    expect(sheet.headers.at(-1)).toBe(EDIT_STATUS_COLUMN);
    expect(sheet.headers.includes('previous value')).toBe(false);
    const byStatus = Object.fromEntries(
      sheet.rows.map((row) => [row.at(-1), row]),
    );
    expect(byStatus.added?.at(-1)).toBe('added');
    expect(byStatus.removed?.at(-1)).toBe('removed');
    expect(byStatus.modified?.at(-1)).toBe('modified');
    expect(byStatus.unchanged?.at(-1)).toBe('unchanged');
    // Modified uses after values (15, not 12)
    const mod = sheet.rows.find((r) => r.at(-1) === 'modified')!;
    expect(mod[2]).toBe(15);
  });
});

describe('splitDiffToWorkbook', () => {
  it('exports two sheets and omits ghost sides', () => {
    const diff = diffResult();
    const wb = splitDiffToWorkbook(diff, diff.rows, {
      baseSheetName: 'BaseSheet',
      overlaySheetName: 'AfterSheet',
    });
    expect(wb.sheets).toHaveLength(2);
    expect(wb.sheets[0]!.name).toBe('BaseSheet');
    expect(wb.sheets[1]!.name).toBe('AfterSheet');
    // Removed row has no B → not in after sheet; added has no A → not in base
    expect(wb.sheets[0]!.rows).toHaveLength(3); // unchanged, modified, removed
    expect(wb.sheets[1]!.rows).toHaveLength(3); // unchanged, modified, added
  });
});
