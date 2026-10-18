import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { OverlaySummary } from '../src/summary/OverlaySummary.js';
import {
  overlaySummary,
  overlaySummaryEmptyTargets,
} from './summary-fixtures.js';

afterEach(() => {
  cleanup();
});

describe('OverlaySummary', () => {
  it('renders without errors given a valid summary', () => {
    render(<OverlaySummary summary={overlaySummary} />);
    expect(screen.getByText('Overlay summary')).toBeInTheDocument();
  });

  it('row-level counts render at top (all five)', () => {
    const { container } = render(<OverlaySummary summary={overlaySummary} />);
    const tiles = container.querySelectorAll('.edv-summary-tile');
    const byLabel = Object.fromEntries(
      [...tiles].map((t) => [
        t.querySelector('.edv-summary-tile__label')?.textContent,
        t.querySelector('.edv-summary-tile__value')?.textContent,
      ]),
    );
    expect(byLabel).toMatchObject({
      base: '20',
      overlay: '10',
      matched: '18',
      unmatched: '2',
      dropped: '0',
    });
  });

  it('targetColumns render below as column cards per their treatment', () => {
    render(<OverlaySummary summary={overlaySummary} />);
    expect(screen.getByText('Unit Rate')).toBeInTheDocument();
    expect(screen.getByText('Mode')).toBeInTheDocument();
    const numCard = screen.getByText('Unit Rate').closest('article')!;
    expect(within(numCard).getByText(/mean/i)).toBeInTheDocument();
  });

  it('empty targetColumns → shows no derived columns message', () => {
    render(<OverlaySummary summary={overlaySummaryEmptyTargets} />);
    expect(screen.getByText(/no derived columns/i)).toBeInTheDocument();
  });

  it('renderers.numeric override on target columns', () => {
    render(
      <OverlaySummary
        summary={overlaySummary}
        renderers={{
          numeric: () => <div data-testid="ov-num">n</div>,
        }}
      />,
    );
    expect(screen.getByTestId('ov-num')).toBeInTheDocument();
    const card = screen.getByText('Unit Rate').closest('article')!;
    expect(within(card).getByText(/count 4/)).toBeInTheDocument();
  });

  it('date and boolean renderer overrides independently', () => {
    const withDateBool = {
      ...overlaySummary,
      targetColumns: [
        ...overlaySummary.targetColumns,
        {
          column: 'Effective',
          treatment: 'date' as const,
          count: 1,
          nullCount: 0,
          min: '2024-01-01',
          max: '2024-01-02',
          distinctCount: 2,
        },
        {
          column: 'Active',
          treatment: 'boolean' as const,
          count: 2,
          nullCount: 0,
          trueCount: 1,
          falseCount: 1,
        },
      ],
    };

    render(
      <OverlaySummary
        summary={withDateBool}
        renderers={{
          date: () => <div data-testid="ov-date">d</div>,
          boolean: () => <div data-testid="ov-bool">b</div>,
        }}
      />,
    );
    expect(screen.getByTestId('ov-date')).toBeInTheDocument();
    expect(screen.getByTestId('ov-bool')).toBeInTheDocument();
  });

  it('theme and classNames props applied', () => {
    const { container } = render(
      <OverlaySummary
        summary={overlaySummary}
        theme={{ colors: { border: '#ff00aa' } }}
        classNames={{ columnCard: 'my-card' }}
      />,
    );
    const root = container.querySelector(
      '[data-edv-component="overlay-summary"]',
    );
    expect(root).toHaveStyle({ '--edv-border-color': '#ff00aa' });
    expect(container.querySelector('.my-card')).not.toBeNull();
  });
});
