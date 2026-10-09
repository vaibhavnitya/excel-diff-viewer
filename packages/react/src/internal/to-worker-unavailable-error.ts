import { createDiffError, type DiffError } from '@mojro/excel-diff-core';

function isDiffError(value: unknown): value is DiffError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as DiffError).code === 'string' &&
    typeof (value as DiffError).message === 'string'
  );
}

/** Normalize a thrown createWorker failure into a WORKER_UNAVAILABLE DiffError. */
export function toWorkerUnavailableError(cause: unknown): DiffError {
  if (isDiffError(cause)) {
    return cause;
  }
  return createDiffError(
    'WORKER_UNAVAILABLE',
    cause instanceof Error
      ? cause.message
      : 'Failed to construct Worker.',
    { cause: String(cause) },
  );
}
