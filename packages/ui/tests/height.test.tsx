import './mock-hooks.js';
import './mock-ag-grid.js';

import { render } from '@testing-library/react';
import { useExcelDiff, useExcelFile } from '@your-scope/excel-diff-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExcelDiffViewer } from '../src/excel-diff-viewer.js';
import { ExcelSplitViewer } from '../src/excel-split-viewer.js';
import { ExcelViewer } from '../src/excel-viewer.js';
import { gridContainerStyle } from '../src/utils/grid-container-style.js';
import { diffResult, schema, workbook } from './fixtures.js';

const useExcelFileMock = vi.mocked(useExcelFile);
const useExcelDiffMock = vi.mocked(useExcelDiff);

describe('gridContainerStyle', () => {
  it('defaults to 100% height with 400px minHeight', () => {
    expect(gridContainerStyle()).toEqual({ height: '100%', minHeight: 400 });
  });

  it('uses an explicit height prop when provided', () => {
    expect(gridContainerStyle(600)).toEqual({ height: 600, minHeight: 400 });
    expect(gridContainerStyle('80vh')).toEqual({ height: '80vh', minHeight: 400 });
  });
});

describe('component height handling', () => {
  beforeEach(() => {
    useExcelFileMock.mockReset();
    useExcelDiffMock.mockReset();
    useExcelFileMock.mockReturnValue({
      status: 'success',
      workbook: workbook(['Sheet1']),
    });
    useExcelDiffMock.mockReturnValue({
      status: 'success',
      diff: diffResult(),
      workbookA: workbook(['A']),
      workbookB: workbook(['B']),
    });
  });

  it('applies height prop and minHeight on ExcelViewer grid wrapper', () => {
    const { container } = render(
      <ExcelViewer file={new ArrayBuffer(8)} height={600} />,
    );
    const grid = container.querySelector('[data-edv-grid="sheet"]');
    expect(grid).not.toBeNull();
    expect(grid).toHaveStyle({ height: '600px', minHeight: '400px' });
  });

  it('defaults ExcelViewer grid wrapper to height 100% with minHeight 400', () => {
    const { container } = render(<ExcelViewer file={new ArrayBuffer(8)} />);
    const grid = container.querySelector('[data-edv-grid="sheet"]');
    expect(grid).not.toBeNull();
    expect(grid).toHaveStyle({ height: '100%', minHeight: '400px' });
  });

  it('applies height prop on ExcelDiffViewer grid wrapper', () => {
    const { container } = render(
      <ExcelDiffViewer
        fileA={new ArrayBuffer(8)}
        fileB={new ArrayBuffer(8)}
        schema={schema}
        height="80vh"
      />,
    );
    const grid = container.querySelector('[data-edv-grid="diff"]');
    expect(grid).not.toBeNull();
    // Assert the inline style attribute — happy-dom may resolve vh to px in computed style.
    expect(grid?.getAttribute('style') ?? '').toMatch(/height:\s*80vh/);
    expect(grid?.getAttribute('style') ?? '').toMatch(/min-height:\s*400px/);
  });

  it('applies height prop on ExcelSplitViewer split container', () => {
    const { container } = render(
      <ExcelSplitViewer
        fileA={new ArrayBuffer(8)}
        fileB={new ArrayBuffer(8)}
        schema={schema}
        height={500}
      />,
    );
    const split = container.querySelector('[data-edv-grid="split"]');
    expect(split).not.toBeNull();
    expect(split).toHaveStyle({ height: '500px', minHeight: '400px' });
  });
});
