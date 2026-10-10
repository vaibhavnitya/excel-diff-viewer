import './mock-hooks.js';
import './mock-ag-grid.js';

import type React from 'react';
import { render } from '@testing-library/react';
import { useExcelFile } from '@mojro/excel-diff-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExcelViewer } from '../src/excel-viewer.js';
import { workbook } from './fixtures.js';
import { getLastAgGridProps, resetCapturedAgGridProps } from './mock-ag-grid.js';

const useExcelFileMock = vi.mocked(useExcelFile);

describe('theme prop', () => {
  beforeEach(() => {
    useExcelFileMock.mockReset();
    useExcelFileMock.mockReturnValue({
      status: 'success',
      workbook: workbook(['Only']),
    });
    resetCapturedAgGridProps();
  });

  it('applies theme CSS variables on the root element', () => {
    const { container } = render(
      <ExcelViewer
        file={new ArrayBuffer(8)}
        theme={{ colors: { added: '#00aa00', bg: '#fafafa' } }}
      />,
    );
    const root = container.querySelector('[data-edv-component="viewer"]');
    expect(root).not.toBeNull();
    const style = (root as HTMLElement).style;
    expect(style.getPropertyValue('--edv-added-bg')).toBe('#00aa00');
    expect(style.getPropertyValue('--edv-bg-color')).toBe('#fafafa');
  });

  it('passes theme.spacing.rowHeight to AgGridReact', () => {
    render(
      <ExcelViewer
        file={new ArrayBuffer(8)}
        theme={{ spacing: { rowHeight: 44, headerHeight: 52 } }}
      />,
    );
    const props = getLastAgGridProps();
    expect(props?.rowHeight).toBe(44);
    expect(props?.headerHeight).toBe(52);
  });

  it('lets agGridProps.rowHeight win over theme.spacing.rowHeight', () => {
    render(
      <ExcelViewer
        file={new ArrayBuffer(8)}
        theme={{ spacing: { rowHeight: 44 } }}
        agGridProps={{ rowHeight: 60 }}
      />,
    );
    expect(getLastAgGridProps()?.rowHeight).toBe(60);
  });

  it('merges user style after theme (user wins on conflicts)', () => {
    const { container } = render(
      <ExcelViewer
        file={new ArrayBuffer(8)}
        theme={{ colors: { bg: '#111111' } }}
        style={
          {
            backgroundColor: 'red',
            // user can also override a CSS var directly
            '--edv-bg-color': '#eeeeee',
          } as React.CSSProperties
        }
      />,
    );
    const root = container.querySelector(
      '[data-edv-component="viewer"]',
    ) as HTMLElement;
    expect(root.style.backgroundColor).toBe('red');
    expect(root.style.getPropertyValue('--edv-bg-color')).toBe('#eeeeee');
  });

  it('keeps dark-mode CSS available for variables the theme does not set', () => {
    // Simulate host dark mode tokens on :root; theme only overrides added bg.
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.style.setProperty('--edv-removed-bg', '#7f1d1d');

    const { container } = render(
      <ExcelViewer
        file={new ArrayBuffer(8)}
        theme={{ colors: { added: '#00ff88' } }}
      />,
    );
    const root = container.querySelector(
      '[data-edv-component="viewer"]',
    ) as HTMLElement;

    expect(root.style.getPropertyValue('--edv-added-bg')).toBe('#00ff88');
    // Theme did not set removed — no inline override; dark / host CSS still applies.
    expect(root.style.getPropertyValue('--edv-removed-bg')).toBe('');

    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('--edv-removed-bg');
  });
});
