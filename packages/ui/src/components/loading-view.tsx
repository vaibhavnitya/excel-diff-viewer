import { phaseLabel } from '../utils/phase-label.js';
import { cx } from '../utils/cx.js';

export type LoadingViewProps = {
  progress: number;
  phase?: string;
  className?: string;
};

export function LoadingView({ progress, phase, className }: LoadingViewProps) {
  const label = phaseLabel(phase);
  const pct = Math.max(0, Math.min(100, progress));
  const showBar = pct > 0;

  return (
    <div className={cx('edv-loading', className)} role="status" aria-live="polite">
      {showBar ? (
        <div
          className="edv-loading__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        >
          <div className="edv-loading__bar-fill" style={{ width: `${pct}%` }} />
        </div>
      ) : (
        <div className="edv-loading__spinner" aria-hidden="true" />
      )}
      {label !== undefined ? <div className="edv-loading__phase">{label}</div> : null}
      {showBar ? <div className="edv-loading__phase">{Math.round(pct)}%</div> : null}
    </div>
  );
}
