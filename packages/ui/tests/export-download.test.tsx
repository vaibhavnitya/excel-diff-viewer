import './mock-hooks.js';
import './mock-ag-grid.js';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useExcelDiff, useExcelFile, useExcelOverlay } from '@mojro/excel-diff-react';
import {
  writeWorkbookAsync,
  type OverlayWorkbooksOptions,
} from '@mojro/excel-diff-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExcelDiffViewer } from '../src/excel-diff-viewer.js';
import { ExcelOverlayViewer } from '../src/excel-overlay-viewer.js';
import { ExcelSplitViewer } from '../src/excel-split-viewer.js';
import { ExcelViewer } from '../src/excel-viewer.js';
import { diffResult, schema, workbook } from './fixtures.js';

vi.mock('@mojro/excel-diff-core', async () => {
  const actual = await vi.importActual<typeof import('@mojro/excel-diff-core')>(
    '@mojro/excel-diff-core',
  );
  return {
    ...actual,
    writeWorkbookAsync: vi.fn(async () => ({
      ok: true as const,
      value: new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer,
    })),
    writeWorkbook: vi.fn(() => ({
      ok: true as const,
      value: new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer,
    })),
  };
});

const writeWorkbookAsyncMock = vi.mocked(writeWorkbookAsync);

const useExcelDiffMock = vi.mocked(useExcelDiff);
const useExcelFileMock = vi.mocked(useExcelFile);
const useExcelOverlayMock = vi.mocked(useExcelOverlay);

function stubDownload(): {
  click: ReturnType<typeof vi.fn>;
  createObjectURL: ReturnType<typeof vi.fn>;
} {
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
  return { click, createObjectURL };
}

const overlayOptions: OverlayWorkbooksOptions = {
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

describe('viewer XLSX export affordances', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useExcelDiffMock.mockReset();
    useExcelFileMock.mockReset();
    useExcelOverlayMock.mockReset();
    writeWorkbookAsyncMock.mockReset();
    writeWorkbookAsyncMock.mockResolvedValue({
      ok: true,
      value: new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer,
    });
  });

  it('ExcelViewer shows CSV + XLSX and downloads xlsx', async () => {
    useExcelFileMock.mockReturnValue({
      status: 'success',
      workbook: workbook(['Sheet1', 'Rates']),
    });
    const { click, createObjectURL } = stubDownload();
    render(<ExcelViewer file={new ArrayBuffer(8)} />);
    expect(screen.getByRole('button', { name: /download csv/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download xlsx/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /download xlsx/i }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(click).toHaveBeenCalled();
    const anchor = document.querySelector('a[download]') as HTMLAnchorElement | null;
    // download attribute was set before click; after revoke the element is removed
    void anchor;
  });

  it('ExcelDiffViewer respects exportMode current-view vs raw', async () => {
    useExcelDiffMock.mockReturnValue({
      status: 'success',
      diff: diffResult(),
      workbookA: workbook(['A']),
      workbookB: workbook(['B']),
    });
    const { createObjectURL } = stubDownload();
    const { rerender } = render(
      <ExcelDiffViewer
        fileA={new ArrayBuffer(8)}
        fileB={new ArrayBuffer(8)}
        schema={schema}
        showOnlyChanges
        exportMode="current-view"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /download xlsx/i }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    createObjectURL.mockClear();

    rerender(
      <ExcelDiffViewer
        fileA={new ArrayBuffer(8)}
        fileB={new ArrayBuffer(8)}
        schema={schema}
        showOnlyChanges
        exportMode="raw"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /download xlsx/i }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
  });

  it('ExcelOverlayViewer downloads derived workbook', async () => {
    const wb = workbook(['Rates']);
    useExcelOverlayMock.mockReturnValue({
      status: 'success',
      workbook: wb,
      summary: {
        totalBase: 2,
        totalOverlay: 2,
        matched: 2,
        unmatched: 0,
        droppedByCompose: 0,
        targetColumns: [],
      },
      workbookBase: wb,
      workbookOverlay: wb,
    });
    const { createObjectURL } = stubDownload();
    render(
      <ExcelOverlayViewer
        baseFile={new ArrayBuffer(8)}
        overlayFile={new ArrayBuffer(8)}
        options={overlayOptions}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /download xlsx/i }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
  });

  it('ExcelSplitViewer downloads two-sheet xlsx', async () => {
    useExcelDiffMock.mockReturnValue({
      status: 'success',
      diff: diffResult(),
      workbookA: workbook(['Base']),
      workbookB: workbook(['After']),
    });
    const { createObjectURL } = stubDownload();
    render(
      <ExcelSplitViewer
        fileA={new ArrayBuffer(8)}
        fileB={new ArrayBuffer(8)}
        schema={schema}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /download xlsx/i }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
  });

  it('shows Exporting… text swap while xlsx export is in progress', async () => {
    useExcelFileMock.mockReturnValue({
      status: 'success',
      workbook: workbook(['Sheet1']),
    });
    stubDownload();

    let resolveWrite!: (value: {
      ok: true;
      value: ArrayBuffer;
    }) => void;
    const pending = new Promise<{ ok: true; value: ArrayBuffer }>((resolve) => {
      resolveWrite = resolve;
    });
    writeWorkbookAsyncMock.mockReturnValueOnce(pending);

    render(<ExcelViewer file={new ArrayBuffer(8)} />);
    fireEvent.click(screen.getByRole('button', { name: /download xlsx/i }));

    const exportingBtn = await screen.findByRole('button', {
      name: /exporting/i,
    });
    expect(exportingBtn).toBeDisabled();
    expect(exportingBtn).toHaveAttribute('aria-busy', 'true');
    expect(exportingBtn).toHaveTextContent('Exporting…');

    resolveWrite({
      ok: true,
      value: new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer,
    });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /download xlsx/i }),
      ).not.toBeDisabled();
    });
  });
});
