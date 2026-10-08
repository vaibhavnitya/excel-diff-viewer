import type { DiffError, DiffErrorCode } from './types.js';

/**
 * Build a typed engine error. Prefer this over raw object literals so every
 * failure carries a stable `code` and an actionable `message`.
 */
export function createDiffError(
  code: DiffErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): DiffError {
  if (details === undefined) {
    return { code, message };
  }
  return { code, message, details };
}
