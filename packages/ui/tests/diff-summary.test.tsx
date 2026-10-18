import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DiffSummary } from '../src/summary/DiffSummary.js';
import { diffSummary } from './summary-fixtures.js';

afterEach(() => {
  cleanup();
});

describe('DiffSummary', () => {
  it('renders without errors given a valid summary', () => {
    render(<DiffSummary summary={diffSummary} />);
    expect(screen.getByText('Diff summary')).toBeInTheDocument();
  });

  it('row-level counts render at top', () => {
    const { container } = render(<DiffSummary summary={diffSummary} />);
    const tiles = container.querySelectorAll('.edv-summary-tile');
    const byLabel = Object.fromEntries(
      [...tiles].map((t) => [
        t.querySelector('.edv-summary-tile__label')?.textContent,
        t.querySelector('.edv-summary-tile__value')?.textContent,
      ]),
    );
    expect(byLabel).toMatchObject({
      added: '2',
      removed: '1',
      modified: '3',
      unchanged: '4',
    });
  });

  it('field change aggregates render below as cards', () => {
    render(<DiffSummary summary={diffSummary} />);
    expect(screen.getByText('rate')).toBeInTheDocument();
    expect(screen.getByText('mode')).toBeInTheDocument();
  });

  it('a field with only numeric changes shows numeric aggregate card', () => {
    render(<DiffSummary summary={diffSummary} />);
    const card = screen.getByText('rate').closest('article')!;
    expect(card.querySelector('[data-edv-field-kind="numeric"]')).not.toBeNull();
    expect(within(card).getByText('mean Δ')).toBeInTheDocument();
    expect(within(card).queryByText(/→/)).toBeNull();
  });

  it('a field with only categorical changes shows categorical aggregate card', () => {
    render(<DiffSummary summary={diffSummary} />);
    const card = screen.getByText('mode').closest('article')!;
    expect(
      card.querySelector('[data-edv-field-kind="categorical"]'),
    ).not.toBeNull();
    expect(within(card).getByText(/air → ocean/)).toBeInTheDocument();
  });

  it('theme and classNames props applied', () => {
    const { container } = render(
      <DiffSummary
        summary={diffSummary}
        theme={{ colors: { fg: '#112233' } }}
        classNames={{ root: 'diff-root', statTile: 'my-tile' }}
      />,
    );
    const root = container.querySelector('[data-edv-component="diff-summary"]');
    expect(root).toHaveStyle({ '--edv-text-color': '#112233' });
    expect(container.querySelector('.diff-root')).not.toBeNull();
    expect(container.querySelector('.my-tile')).not.toBeNull();
  });

  it('empty fieldChanges renders without crashing', () => {
    render(
      <DiffSummary
        summary={{
          ...diffSummary,
          fieldChanges: [],
        }}
      />,
    );
    expect(screen.getByText(/no field changes/i)).toBeInTheDocument();
  });
});
