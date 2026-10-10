import './mock-hooks.js';
import './mock-ag-grid.js';

import { fireEvent, render, screen } from '@testing-library/react';
import { useExcelFile } from '@mojro/excel-diff-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExcelViewer } from '../src/excel-viewer.js';
import { ALL_ERROR_CODES, makeError, workbook } from './fixtures.js';
import { getLastAgGridProps, resetCapturedAgGridProps } from './mock-ag-grid.js';

const useExcelFileMock = vi.mocked(useExcelFile);

describe('ExcelViewer', () => {
  beforeEach(() => {
    useExcelFileMock.mockReset();
    useExcelFileMock.mockReturnValue({ status: 'idle' });
    resetCapturedAgGridProps();
  });

  it('renders a workbook and sheet tabs for multi-sheet files', () => {
    useExcelFileMock.mockReturnValue({
      status: 'success',
      workbook: workbook(['Sheet1', 'Rates']),
    });
    render(<ExcelViewer file={new ArrayBuffer(8)} />);
    expect(screen.getByRole('tab', { name: 'Sheet1' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Rates' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-grid')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Rates' }));
    expect(screen.getByRole('tab', { name: 'Rates' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('shows loading state during parse', () => {
    useExcelFileMock.mockReturnValue({ status: 'loading', progress: 0 });
    render(<ExcelViewer file={new ArrayBuffer(8)} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(document.querySelector('.edv-loading__spinner')).not.toBeNull();
  });

  it('shows determinate progress when progress > 0', () => {
    useExcelFileMock.mockReturnValue({ status: 'loading', progress: 42 });
    render(<ExcelViewer file={new ArrayBuffer(8)} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
  });

  it.each(ALL_ERROR_CODES)('shows error UI for %s', (code) => {
    const error = makeError(code);
    useExcelFileMock.mockReturnValue({ status: 'error', error });
    const { unmount } = render(<ExcelViewer file={new ArrayBuffer(8)} />);
    expect(screen.getByRole('alert')).toHaveAttribute('data-edv-error-code', code);
    expect(screen.getByText(error.message)).toBeInTheDocument();
    unmount();
  });

  it('applies classNames overrides', () => {
    useExcelFileMock.mockReturnValue({
      status: 'success',
      workbook: workbook(['Only']),
    });
    const { container } = render(
      <ExcelViewer file={new ArrayBuffer(8)} classNames={{ root: 'custom-root' }} />,
    );
    expect(container.querySelector('.edv-root.custom-root')).not.toBeNull();
  });

  it('forwards limits into the hook', () => {
    useExcelFileMock.mockReturnValue({ status: 'idle' });
    const limits = { maxFileSizeBytes: 1_000 };
    render(<ExcelViewer file={null} limits={limits} />);
    expect(useExcelFileMock).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ limits }),
    );
  });

  it('calls onError when hook returns error', () => {
    const onError = vi.fn();
    const error = makeError('PARSE_ERROR');
    useExcelFileMock.mockReturnValue({ status: 'error', error });
    render(<ExcelViewer file={new ArrayBuffer(8)} onError={onError} />);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('passes agGridProps.sideBar through to AgGridReact', () => {
    useExcelFileMock.mockReturnValue({
      status: 'success',
      workbook: workbook(['Only']),
    });
    render(
      <ExcelViewer
        file={new ArrayBuffer(8)}
        agGridProps={{ sideBar: true }}
      />,
    );
    expect(getLastAgGridProps()?.sideBar).toBe(true);
  });

  it('ignores user rowData (locked) and warns in development', () => {
    useExcelFileMock.mockReturnValue({
      status: 'success',
      workbook: workbook(['Only']),
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <ExcelViewer
        file={new ArrayBuffer(8)}
        agGridProps={{
          rowData: [{ __rowIndex: 99, origin: 'HACKED' }],
        }}
      />,
    );
    const props = getLastAgGridProps();
    expect(props?.rowData).toBeDefined();
    expect(props?.rowData?.[0]).toMatchObject({ origin: 'US' });
    expect(props?.rowData?.[0]).not.toMatchObject({ origin: 'HACKED' });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('agGridProps.rowData is locked'),
    );
    warn.mockRestore();
  });

  it('uses agNumberColumnFilter for numeric columns in generated columnDefs', () => {
    useExcelFileMock.mockReturnValue({
      status: 'success',
      workbook: workbook(['Only']),
    });
    render(<ExcelViewer file={new ArrayBuffer(8)} />);
    const cols = getLastAgGridProps()?.columnDefs ?? [];
    const rateCol = cols.find((c) => c.field === 'base_rate');
    expect(rateCol?.filter).toBe('agNumberColumnFilter');
    const originCol = cols.find((c) => c.field === 'origin');
    expect(originCol?.filter).toBe('agTextColumnFilter');
  });
});
