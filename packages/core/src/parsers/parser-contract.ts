/**
 * Canonical Parser contract (Liskov substitution point).
 * Concrete parsers (`xlsx.ts`, `csv.ts`) implement this interface.
 * Re-exported via `types.ts` → `index.ts` for the public API.
 */

import type { DiffError, FileFormat, Limits, Result, Workbook } from '../types.js';

/**
 * File bytes for parsing.
 * No `File` (DOM) and no filesystem paths (I/O belongs in the shell).
 * Node `Buffer` is accepted at runtime via structural compatibility with
 * `Uint8Array` (Buffer extends Uint8Array).
 */
export type ParseInput = ArrayBuffer | Uint8Array;

export type ParseFileOptions = {
  /** Used for extension-based format fallback and error messages. */
  readonly filename?: string;
  /** Force format; skips magic-byte / extension detection when set. */
  readonly format?: FileFormat;
  readonly limits?: Partial<Limits>;
};

/**
 * Liskov substitution point for concrete parsers (`xlsx`, `csv`).
 * Synchronous: `parseFile` may wrap this in a `Promise` for a uniform async API.
 */
export interface Parser {
  readonly format: FileFormat;
  parse(input: ParseInput, options?: ParseFileOptions): Result<Workbook, DiffError>;
}
