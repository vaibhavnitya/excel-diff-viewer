import type { DiffError } from '@your-scope/excel-diff-core';
import {
  isReportableError,
  isWarningError,
  suggestionFor,
} from '../errors/suggestions.js';
import { cx } from '../utils/cx.js';

export type ErrorViewProps = {
  error: DiffError;
  className?: string;
};

export function ErrorView({ error, className }: ErrorViewProps) {
  const warning = isWarningError(error);
  return (
    <div
      className={cx('edv-error', warning && 'edv-error--warning', className)}
      role="alert"
      data-edv-error-code={error.code}
    >
      <span className="edv-error__indicator" aria-hidden="true" />
      <div className="edv-error__body">
        <p className="edv-error__message">{error.message}</p>
        <p className="edv-error__suggestion">{suggestionFor(error)}</p>
        <span className="edv-error__code">{error.code}</span>
        {isReportableError(error) ? (
          <a
            className="edv-error__report"
            href="https://github.com/your-scope/excel-diff-viewer/issues"
            target="_blank"
            rel="noreferrer"
          >
            Report issue
          </a>
        ) : null}
      </div>
    </div>
  );
}
