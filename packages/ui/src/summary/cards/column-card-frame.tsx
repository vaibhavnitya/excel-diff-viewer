import type { ReactNode } from 'react';
import { cx } from '../../utils/cx.js';

type ColumnCardFrameProps = {
  readonly title: string;
  readonly count?: number;
  readonly nullCount?: number;
  readonly className?: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
};

/**
 * Shared card chrome: column title + optional count/nullCount stats,
 * visualization slot, optional footer.
 */
export function ColumnCardFrame({
  title,
  count,
  nullCount,
  className,
  children,
  footer,
}: ColumnCardFrameProps) {
  return (
    <article className={cx('edv-summary-card', className)}>
      <header className="edv-summary-card__header">
        <h3 className="edv-summary-card__title">{title}</h3>
        {count !== undefined || nullCount !== undefined ? (
          <div className="edv-summary-card__meta">
            {count !== undefined ? (
              <span className="edv-summary-card__stat">count {count}</span>
            ) : null}
            {nullCount !== undefined ? (
              <span className="edv-summary-card__stat">
                null {nullCount}
              </span>
            ) : null}
          </div>
        ) : null}
      </header>
      <div className="edv-summary-card__body">{children}</div>
      {footer !== undefined && footer !== null ? (
        <footer className="edv-summary-card__footer">{footer}</footer>
      ) : null}
    </article>
  );
}
