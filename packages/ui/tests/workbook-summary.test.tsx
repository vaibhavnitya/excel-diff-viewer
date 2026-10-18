import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkbookSummary } from '../src/summary/WorkbookSummary.js';
import {
  emptyWorkbookSummary,
  workbookSummary,
} from './summary-fixtures.js';

afterEach(() => {
  cleanup();
});

describe('WorkbookSummary', () => {
  it('renders without errors given a valid summary', () => {
    render(<WorkbookSummary summary={workbookSummary} />);
    expect(screen.getByText('Workbook summary')).toBeInTheDocument();
    expect(screen.getByText('Unit Rate')).toBeInTheDocument();
  });

  it('default numeric rendering shows min/max/mean/median', () => {
    render(<WorkbookSummary summary={workbookSummary} />);
    const card = screen.getByText('Unit Rate').closest('article')!;
    expect(within(card).getByText(/min/i)).toBeInTheDocument();
    expect(within(card).getByText(/max/i)).toBeInTheDocument();
    expect(within(card).getByText(/mean/i)).toBeInTheDocument();
    expect(within(card).getByText(/median/i)).toBeInTheDocument();
    expect(card.textContent).toMatch(/10/);
    expect(card.textContent).toMatch(/40/);
    expect(card.textContent).toMatch(/25/);
  });

  it('default categorical rendering shows top values with bars', () => {
    render(<WorkbookSummary summary={workbookSummary} />);
    const card = screen.getByText('Mode').closest('article')!;
    expect(within(card).getByText('air')).toBeInTheDocument();
    expect(card.querySelector('.edv-summary-bars__fill')).not.toBeNull();
  });

  it('default date rendering shows min/max', () => {
    render(<WorkbookSummary summary={workbookSummary} />);
    const card = screen.getByText('Effective').closest('article')!;
    expect(within(card).getByText('2024-01-01')).toBeInTheDocument();
    expect(within(card).getByText('2024-06-15')).toBeInTheDocument();
  });

  it('default boolean rendering shows the divided bar', () => {
    render(<WorkbookSummary summary={workbookSummary} />);
    const card = screen.getByText('Active').closest('article')!;
    expect(card.querySelector('.edv-summary-bool-bar')).not.toBeNull();
    expect(within(card).getByText('3')).toBeInTheDocument();
    expect(within(card).getByText('2')).toBeInTheDocument();
  });

  it('renderers.numeric replaces visualization slot but keeps card frame', () => {
    render(
      <WorkbookSummary
        summary={workbookSummary}
        renderers={{
          numeric: () => <div data-testid="custom-numeric">chart</div>,
        }}
      />,
    );
    const card = screen.getByText('Unit Rate').closest('article')!;
    expect(within(card).getByTestId('custom-numeric')).toBeInTheDocument();
    expect(within(card).getByText(/count 4/)).toBeInTheDocument();
    expect(within(card).queryByText(/mean/i)).toBeNull();
  });

  it('each renderer override independently', () => {
    render(
      <WorkbookSummary
        summary={workbookSummary}
        renderers={{
          categorical: () => <div data-testid="custom-cat">c</div>,
        }}
      />,
    );
    expect(screen.getByTestId('custom-cat')).toBeInTheDocument();
    // Numeric still default
    const numCard = screen.getByText('Unit Rate').closest('article')!;
    expect(within(numCard).getByText(/mean/i)).toBeInTheDocument();
  });

  it('no renderer → default used', () => {
    render(<WorkbookSummary summary={workbookSummary} />);
    expect(screen.queryByTestId('custom-numeric')).toBeNull();
    expect(screen.getByText(/mean/i)).toBeInTheDocument();
  });

  it('theme prop applied as CSS variables', () => {
    const { container } = render(
      <WorkbookSummary
        summary={workbookSummary}
        theme={{ colors: { bg: '#abcdef' } }}
      />,
    );
    const root = container.querySelector('[data-edv-component="workbook-summary"]');
    expect(root).toHaveStyle({ '--edv-bg-color': '#abcdef' });
  });

  it('classNames prop applied', () => {
    const { container } = render(
      <WorkbookSummary
        summary={workbookSummary}
        classNames={{ root: 'my-root', header: 'my-header' }}
      />,
    );
    expect(container.querySelector('.my-root')).not.toBeNull();
    expect(container.querySelector('.my-header')).not.toBeNull();
  });

  it('empty summary (zero columns) renders without crashing', () => {
    render(<WorkbookSummary summary={emptyWorkbookSummary} />);
    expect(screen.getByText(/no columns/i)).toBeInTheDocument();
  });
});
