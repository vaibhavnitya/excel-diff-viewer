/** Coalesce progress updates to ~20/sec. Final 100% always flushes immediately. */
export const PROGRESS_THROTTLE_MS = 50;

export type ProgressThrottle = {
  readonly push: (pct: number) => void;
  readonly cancel: () => void;
};

/**
 * Holds the latest progress in a ref-like closure and flushes via `onFlush`
 * at most once per `intervalMs`. Values `>= 100` flush immediately.
 */
export function createProgressThrottle(
  onFlush: (pct: number) => void,
  intervalMs: number = PROGRESS_THROTTLE_MS,
): ProgressThrottle {
  let latest: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastFlushAt = 0;

  const clearTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const flush = (pct: number): void => {
    lastFlushAt = Date.now();
    latest = null;
    onFlush(pct);
  };

  return {
    push(pct: number): void {
      const clamped = pct < 0 ? 0 : pct > 100 ? 100 : pct;

      if (clamped >= 100) {
        clearTimer();
        flush(100);
        return;
      }

      latest = clamped;
      const elapsed = Date.now() - lastFlushAt;

      if (lastFlushAt === 0 || elapsed >= intervalMs) {
        clearTimer();
        flush(clamped);
        return;
      }

      if (timer === null) {
        timer = setTimeout(() => {
          timer = null;
          if (latest !== null) {
            flush(latest);
          }
        }, intervalMs - elapsed);
      }
    },

    cancel(): void {
      clearTimer();
      latest = null;
    },
  };
}
