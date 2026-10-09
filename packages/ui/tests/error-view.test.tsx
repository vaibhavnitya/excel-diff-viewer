import { cleanup, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ErrorView } from '../src/components/error-view.js';
import { suggestionFor } from '../src/errors/suggestions.js';
import { ALL_ERROR_CODES, makeError } from './fixtures.js';

afterEach(() => {
  cleanup();
});

describe('ErrorView', () => {
  it.each(ALL_ERROR_CODES)('renders tailored copy for %s', (code) => {
    const error = makeError(code);
    const { container } = render(<ErrorView error={error} />);
    const alert = within(container).getByRole('alert');
    expect(alert).toHaveAttribute('data-edv-error-code', code);
    expect(within(alert).getByText(error.message)).toBeInTheDocument();
    expect(within(alert).getByText(code)).toBeInTheDocument();
    expect(within(alert).getByText(suggestionFor(error))).toBeInTheDocument();
  });

  it('shows report link for PARSE_ERROR and WORKER_CRASHED', () => {
    const { rerender, container } = render(
      <ErrorView error={makeError('PARSE_ERROR')} />,
    );
    expect(
      within(container).getByRole('link', { name: /report issue/i }),
    ).toBeInTheDocument();
    rerender(<ErrorView error={makeError('WORKER_CRASHED')} />);
    expect(
      within(container).getByRole('link', { name: /report issue/i }),
    ).toBeInTheDocument();
    rerender(<ErrorView error={makeError('FILE_TOO_LARGE')} />);
    expect(
      within(container).queryByRole('link', { name: /report issue/i }),
    ).not.toBeInTheDocument();
  });

  it('uses warning styling for DUPLICATE_KEYS', () => {
    const { container } = render(<ErrorView error={makeError('DUPLICATE_KEYS')} />);
    expect(container.querySelector('.edv-error--warning')).not.toBeNull();
  });
});
