import { cx } from '../utils/cx.js';

export type EmptyViewProps = {
  className?: string;
  message?: string;
};

export function EmptyView({
  className,
  message = 'No file loaded.',
}: EmptyViewProps) {
  return (
    <div className={cx('edv-empty', className)} data-edv-empty>
      {message}
    </div>
  );
}
