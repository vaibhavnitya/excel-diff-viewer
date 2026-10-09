import { DEFAULT_KEY_CANDIDATES } from '../defaults.js';
import { createDiffError } from '../errors.js';
import { err, ok } from '../result.js';
import type { DiffError, DiffSchema, InferSchemaOptions, Result } from '../types.js';

/**
 * Infer key/value fields from headers using a case-insensitive candidate list.
 * Zero matches → SCHEMA_INFERENCE_FAILED (does not guess).
 *
 * @example
 * ```ts
 * import { inferSchema, parseFile } from '@mojro/excel-diff-core';
 *
 * const parsed = await parseFile(bytes, { filename: 'rates.xlsx' });
 * if (!parsed.ok) throw new Error(parsed.error.message);
 * const inferred = inferSchema(parsed.value.sheets[0].headers);
 * if (!inferred.ok) throw new Error(inferred.error.message);
 * const schema = inferred.value;
 * ```
 */
export function inferSchema(
  headers: readonly string[],
  options?: InferSchemaOptions,
): Result<DiffSchema, DiffError> {
  const candidates = (options?.keyCandidates ?? DEFAULT_KEY_CANDIDATES).map((c) =>
    c.toLowerCase(),
  );
  const candidateSet = new Set(candidates);

  const keyFields: string[] = [];
  const valueFields: string[] = [];

  for (const header of headers) {
    if (candidateSet.has(header.toLowerCase())) {
      keyFields.push(header);
    } else {
      valueFields.push(header);
    }
  }

  if (keyFields.length === 0) {
    return err(
      createDiffError(
        'SCHEMA_INFERENCE_FAILED',
        `Could not infer key fields from headers [${headers.join(', ')}]. None matched the key candidate list. Pass schema explicitly or extend keyCandidates.`,
        { headers, keyCandidates: options?.keyCandidates ?? DEFAULT_KEY_CANDIDATES },
      ),
    );
  }

  // Common rate-card pattern: treat origin-like keys as optional wildcards
  const optionalKeyFields = keyFields.filter((h) => {
    const lower = h.toLowerCase();
    return (
      lower === 'origin' ||
      lower === 'source' ||
      lower === 'from' ||
      lower === 'pickup'
    );
  });

  return ok({
    keyFields,
    valueFields,
    optionalKeyFields: optionalKeyFields.length > 0 ? optionalKeyFields : undefined,
  });
}
