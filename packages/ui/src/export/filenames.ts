/** Strip a trailing extension (`.xlsx`, `.csv`, …) from a filename. */
export function stripExtension(filename: string): string {
  const trimmed = filename.trim();
  const dot = trimmed.lastIndexOf('.');
  if (dot <= 0) return trimmed;
  return trimmed.slice(0, dot);
}

export function viewerExportFilename(originalFilename: string | undefined): string {
  if (originalFilename === undefined || originalFilename.trim() === '') {
    return 'export.xlsx';
  }
  return `${stripExtension(originalFilename)}-export.xlsx`;
}

export function diffExportFilename(
  baseFilename: string | undefined,
  afterFilename: string | undefined,
): string {
  const base = baseFilename?.trim() ? stripExtension(baseFilename) : undefined;
  const after = afterFilename?.trim() ? stripExtension(afterFilename) : undefined;
  if (base !== undefined && after !== undefined) {
    return `diff-${base}-vs-${after}.xlsx`;
  }
  return 'diff.xlsx';
}

export function overlayExportFilename(baseFilename: string | undefined): string {
  if (baseFilename === undefined || baseFilename.trim() === '') {
    return 'overlay.xlsx';
  }
  return `overlay-${stripExtension(baseFilename)}.xlsx`;
}

export function splitExportFilename(
  baseFilename: string | undefined,
  afterFilename: string | undefined,
): string {
  return diffExportFilename(baseFilename, afterFilename).replace(
    /^diff-/,
    'split-',
  ).replace(/^diff\.xlsx$/, 'split.xlsx');
}
