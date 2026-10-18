import './mock-hooks.js';
import './mock-ag-grid.js';

import { render, screen } from '@testing-library/react';
import { useExcelOverlay } from '@mojro/excel-diff-react';
import type { OverlayWorkbooksOptions } from '@mojro/excel-diff-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExcelOverlayViewer } from '../src/excel-overlay-viewer.js';
import { makeError, workbook } from './fixtures.js';
import { getLastAgGridProps, resetCapturedAgGridProps } from './mock-ag-grid.js';

const useExcelOverlayMock = vi.mocked(useExcelOverlay);

const options: OverlayWorkbooksOptions = {
  schema: {
    join: { base: ['origin'], overlay: ['origin'] },
    compose: {
      kind: 'rules',
      rules: [
        {
          op: 'add',
          base: 'base_rate',
          overlay: 'base_rate',
          target: 'total',
        },
      ],
    },
  },
};

describe('ExcelOverlayViewer', () => {
  beforeEach(() => {
    useExcelOverlayMock.mockReset();
    useExcelOverlayMock.mockReturnValue({ status: 'idle' });
    resetCapturedAgGridProps();
  });

  it('renders derived workbook and toolbar stats for rules compose', () => {
    const wb = workbook(['Rates']);
    useExcelOverlayMock.mockReturnValue({
      status: 'success',
      workbook: wb,
      summary: {
        totalBase: 10,
        totalOverlay: 3,
        matched: 8,
        unmatched: 2,
        droppedByCompose: 0,
        targetColumns: [],
      },
      workbookBase: wb,
      workbookOverlay: wb,
    });
    render(
      <ExcelOverlayViewer
        baseFile={new ArrayBuffer(8)}
        overlayFile={new ArrayBuffer(8)}
        options={options}
      />,
    );
    expect(screen.getByTestId('mock-grid')).toBeInTheDocument();
    expect(screen.getByText(/10 rows • 8 matched • 2 unmatched/)).toBeInTheDocument();
  });

  it('renders fn compose success the same way', () => {
    const wb = workbook(['Rates']);
    const fnOptions: OverlayWorkbooksOptions = {
      schema: {
        join: { base: ['origin'], overlay: ['origin'] },
        compose: { kind: 'fn', fn: (row) => row },
      },
    };
    useExcelOverlayMock.mockReturnValue({
      status: 'success',
      workbook: wb,
      summary: {
        totalBase: 5,
        totalOverlay: 2,
        matched: 4,
        unmatched: 1,
        droppedByCompose: 1,
        targetColumns: [],
      },
      workbookBase: wb,
      workbookOverlay: wb,
    });
    render(
      <ExcelOverlayViewer
        baseFile={new ArrayBuffer(8)}
        overlayFile={new ArrayBuffer(8)}
        options={fnOptions}
      />,
    );
    expect(screen.getByText(/5 rows • 4 matched • 1 unmatched/)).toBeInTheDocument();
  });

  it('renders error via renderError', () => {
    const error = makeError('OVERLAY_AMBIGUOUS_MATCH');
    useExcelOverlayMock.mockReturnValue({ status: 'error', error });
    render(
      <ExcelOverlayViewer
        baseFile={new ArrayBuffer(8)}
        overlayFile={new ArrayBuffer(8)}
        options={options}
        renderError={(e) => <div data-testid="custom-err">{e.code}</div>}
      />,
    );
    expect(screen.getByTestId('custom-err')).toHaveTextContent(
      'OVERLAY_AMBIGUOUS_MATCH',
    );
  });

  it('shows loading with progress', () => {
    useExcelOverlayMock.mockReturnValue({
      status: 'loading',
      progress: 60,
      phase: 'composing',
    });
    render(
      <ExcelOverlayViewer
        baseFile={new ArrayBuffer(8)}
        overlayFile={new ArrayBuffer(8)}
        options={options}
      />,
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
  });

  it('passes agGridProps through', () => {
    const wb = workbook(['Rates']);
    useExcelOverlayMock.mockReturnValue({
      status: 'success',
      workbook: wb,
      summary: {
        totalBase: 1,
        totalOverlay: 1,
        matched: 1,
        unmatched: 0,
        droppedByCompose: 0,
        targetColumns: [],
      },
      workbookBase: wb,
      workbookOverlay: wb,
    });
    render(
      <ExcelOverlayViewer
        baseFile={new ArrayBuffer(8)}
        overlayFile={new ArrayBuffer(8)}
        options={options}
        agGridProps={{ sideBar: true }}
      />,
    );
    expect(getLastAgGridProps()?.sideBar).toBe(true);
  });

  it('applies theme prop as CSS variables on root', () => {
    const wb = workbook(['Rates']);
    useExcelOverlayMock.mockReturnValue({
      status: 'success',
      workbook: wb,
      summary: {
        totalBase: 1,
        totalOverlay: 1,
        matched: 1,
        unmatched: 0,
        droppedByCompose: 0,
        targetColumns: [],
      },
      workbookBase: wb,
      workbookOverlay: wb,
    });
    const { container } = render(
      <ExcelOverlayViewer
        baseFile={new ArrayBuffer(8)}
        overlayFile={new ArrayBuffer(8)}
        options={options}
        theme={{ colors: { added: '#00ff00' } }}
      />,
    );
    const root = container.querySelector('[data-edv-component="overlay"]') as HTMLElement;
    expect(root.style.getPropertyValue('--edv-added-bg')).toBe('#00ff00');
  });
});
