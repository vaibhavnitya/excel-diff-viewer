import { createDiffError } from '../errors.js';
import { err, ok } from '../result.js';
import type { DiffError, FileFormat, Result } from '../types.js';

function toUint8Array(input: ArrayBuffer | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) {
    return input;
  }
  return new Uint8Array(input);
}

function extensionOf(filename: string | undefined): string | undefined {
  if (filename === undefined) {
    return undefined;
  }
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) {
    return undefined;
  }
  return base.slice(dot + 1).toLowerCase();
}

/** ZIP local-file header — xlsx is a ZIP package. */
function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

/** UTF-8 BOM or printable text heuristic for CSV. */
function looksLikeCsv(bytes: Uint8Array): boolean {
  if (bytes.length === 0) {
    return false;
  }
  // UTF-8 BOM
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return true;
  }
  const sampleLen = Math.min(bytes.length, 512);
  let printable = 0;
  for (let i = 0; i < sampleLen; i += 1) {
    const b = bytes[i] ?? 0;
    if (b === 0) {
      return false;
    }
    if (b === 0x09 || b === 0x0a || b === 0x0d || (b >= 0x20 && b <= 0x7e) || b >= 0x80) {
      printable += 1;
    }
  }
  return printable / sampleLen > 0.9;
}

export function detectFormat(
  input: ArrayBuffer | Uint8Array,
  options?: { readonly filename?: string; readonly format?: FileFormat },
): Result<FileFormat, DiffError> {
  if (options?.format !== undefined) {
    return ok(options.format);
  }

  const bytes = toUint8Array(input);
  const ext = extensionOf(options?.filename);

  if (looksLikeZip(bytes)) {
    return ok('xlsx');
  }

  if (ext === 'xlsx' || ext === 'xls') {
    // .xls is not supported by the community parser path we ship; still
    // prefer extension when magic failed (e.g. empty/truncated).
    if (ext === 'xls') {
      return err(
        createDiffError(
          'UNSUPPORTED_FORMAT',
          `File '${options?.filename ?? 'unknown'}' looks like legacy .xls, which is not supported. Save as .xlsx or .csv.`,
          { filename: options?.filename, extension: ext },
        ),
      );
    }
    return ok('xlsx');
  }

  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
    return ok('csv');
  }

  if (looksLikeCsv(bytes)) {
    return ok('csv');
  }

  const label = options?.filename === undefined ? 'File' : `File '${options.filename}'`;
  return err(
    createDiffError(
      'UNSUPPORTED_FORMAT',
      `${label} is not a recognized xlsx or csv. Pass options.format or use a .xlsx/.csv filename.`,
      { filename: options?.filename, extension: ext },
    ),
  );
}
