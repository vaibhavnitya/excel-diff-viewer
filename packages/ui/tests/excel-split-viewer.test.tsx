import './mock-hooks.js';
import './mock-ag-grid.js';

import { render, screen } from '@testing-library/react';
import { useExcelDiff } from '@mojro/excel-diff-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExcelSplitViewer } from '../src/excel-split-viewer.js';
import { diffResult, schema, workbook } from './fixtures.js';

const useExcelDiffMock = vi.mocked(useExcelDiff);

describe('ExcelSplitViewer', () => {
  beforeEach(() => {
    useExcelDiffMock.mockReset();
  });

  it('renders two grids with ghost rows for missing keys', () => {
    useExcelDiffMock.mockReturnValue({
      status: 'success',
      diff: diffResult(),
      workbookA: workbook(['A']),
      workbookB: workbook(['B']),
    });
    render(
      <ExcelSplitViewer
        fileA={new ArrayBuffer(8)}
        fileB={new ArrayBuffer(8)}
        schema={schema}
        labelA="Before"
        labelB="After"
      />,
    );
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
    const grids = screen.getAllByTestId('mock-grid');
    expect(grids).toHaveLength(2);

    const ghostRows = document.querySelectorAll('.edv-ghost-row');
    expect(ghostRows.length).toBeGreaterThanOrEqual(2);
  });
});
