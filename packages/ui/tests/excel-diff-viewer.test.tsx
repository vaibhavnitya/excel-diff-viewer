import './mock-hooks.js';
import './mock-ag-grid.js';

import { fireEvent, render, screen } from '@testing-library/react';
import { useExcelDiff } from '@your-scope/excel-diff-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExcelDiffViewer } from '../src/excel-diff-viewer.js';
import { diffResult, schema, workbook } from './fixtures.js';

const useExcelDiffMock = vi.mocked(useExcelDiff);

describe('ExcelDiffViewer', () => {
  beforeEach(() => {
    useExcelDiffMock.mockReset();
    useExcelDiffMock.mockReturnValue({ status: 'idle' });
  });

  it('renders diff rows with status classes', () => {
    const diff = diffResult();
    useExcelDiffMock.mockReturnValue({
      status: 'success',
      diff,
      workbookA: workbook(['A']),
      workbookB: workbook(['B']),
    });
    render(
      <ExcelDiffViewer
        fileA={new ArrayBuffer(8)}
        fileB={new ArrayBuffer(8)}
        schema={schema}
      />,
    );
    expect(screen.getByTestId('row-US|MX')).toHaveClass('edv-modified-row');
    expect(screen.getByTestId('row-US|BR')).toHaveClass('edv-added-row');
    expect(screen.getByTestId('row-US|PE')).toHaveClass('edv-removed-row');
    expect(screen.getByText('Added 1')).toBeInTheDocument();
  });

  it('filters unchanged rows when showOnlyChanges is enabled', () => {
    useExcelDiffMock.mockReturnValue({
      status: 'success',
      diff: diffResult(),
      workbookA: workbook(['A']),
      workbookB: workbook(['B']),
    });
    render(
      <ExcelDiffViewer
        fileA={new ArrayBuffer(8)}
        fileB={new ArrayBuffer(8)}
        schema={schema}
      />,
    );
    expect(screen.getByTestId('row-US|CA')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/show only changes/i));
    expect(screen.queryByTestId('row-US|CA')).not.toBeInTheDocument();
    expect(screen.getByTestId('row-US|MX')).toBeInTheDocument();
  });

  it('shows loading phase labels', () => {
    useExcelDiffMock.mockReturnValue({
      status: 'loading',
      progress: 10,
      phase: 'diffing',
    });
    render(
      <ExcelDiffViewer
        fileA={new ArrayBuffer(8)}
        fileB={new ArrayBuffer(8)}
        schema={schema}
      />,
    );
    expect(screen.getByText('Diffing')).toBeInTheDocument();
  });

  it('invokes CSV download with expected filename', () => {
    useExcelDiffMock.mockReturnValue({
      status: 'success',
      diff: diffResult(),
      workbookA: workbook(['A']),
      workbookB: workbook(['B']),
    });
    const click = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: click });
      }
      return el;
    });

    render(
      <ExcelDiffViewer
        fileA={new ArrayBuffer(8)}
        fileB={new ArrayBuffer(8)}
        schema={schema}
        exportFilename="rates-diff.csv"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /download csv/i }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
