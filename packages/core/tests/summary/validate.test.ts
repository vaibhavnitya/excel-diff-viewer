import { describe, expect, it } from 'vitest';
import { validateSummaryConfig } from '../../src/summary/validate.js';
import type { Workbook } from '../../src/types.js';

function wb(headers: string[], sheetName = 'Sheet1'): Workbook {
  return {
    sheets: [{ name: sheetName, headers, rows: [[1]] }],
    activeSheetIndex: 0,
    meta: { format: 'csv', filename: 't.csv' },
  };
}

describe('validateSummaryConfig', () => {
  it('accepts empty config and picks first sheet', () => {
    const result = validateSummaryConfig(wb(['a', 'b']), undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.sheet.name).toBe('Sheet1');
    expect(result.value.topN).toBe(10);
  });

  it('rejects missing column in columns', () => {
    const result = validateSummaryConfig(wb(['a']), {
      columns: { missing: 'numeric' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SUMMARY_COLUMN_NOT_FOUND');
  });

  it('rejects missing column in exclude', () => {
    const result = validateSummaryConfig(wb(['a']), { exclude: ['nope'] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SUMMARY_COLUMN_NOT_FOUND');
  });

  it('rejects missing sheetName', () => {
    const result = validateSummaryConfig(wb(['a']), { sheetName: 'Other' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SUMMARY_COLUMN_NOT_FOUND');
  });

  it('rejects invalid topN', () => {
    for (const topN of [0, -1, 1.5]) {
      const result = validateSummaryConfig(wb(['a']), { topN });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('SUMMARY_INVALID_CONFIG');
    }
  });

  it('rejects empty exclude strings', () => {
    const result = validateSummaryConfig(wb(['a']), { exclude: [''] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SUMMARY_INVALID_CONFIG');
  });
});
