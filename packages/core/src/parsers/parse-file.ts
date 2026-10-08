import { mergeLimits } from '../defaults.js';
import {
  enforceInputSize,
  enforceWorkbookLimits,
  inputByteLength,
} from '../limits/enforce-limits.js';
import { err, ok } from '../result.js';
import type { DiffError, Result, Workbook } from '../types.js';
import { csvParser } from './csv.js';
import { detectFormat } from './detect-format.js';
import type { ParseFileOptions, ParseInput, Parser } from './parser-contract.js';
import { xlsxParser } from './xlsx.js';

const PARSERS: Readonly<Record<'xlsx' | 'csv', Parser>> = {
  xlsx: xlsxParser,
  csv: csvParser,
};

/**
 * Parse xlsx or csv bytes into a typed `Workbook`.
 * Async for a stable API (Worker / shell can await uniformly).
 */
export async function parseFile(
  input: ParseInput,
  options?: ParseFileOptions,
): Promise<Result<Workbook, DiffError>> {
  const limits = mergeLimits(options?.limits);
  const sizeResult = enforceInputSize(inputByteLength(input), limits, options?.filename);
  if (!sizeResult.ok) {
    return sizeResult;
  }

  const formatResult = detectFormat(input, {
    filename: options?.filename,
    format: options?.format,
  });
  if (!formatResult.ok) {
    return formatResult;
  }

  const parser = PARSERS[formatResult.value];
  const parsed = parser.parse(input, options);
  if (!parsed.ok) {
    return parsed;
  }

  const limited = enforceWorkbookLimits(parsed.value, options?.limits);
  if (!limited.ok) {
    return limited;
  }

  return ok(limited.value);
}
