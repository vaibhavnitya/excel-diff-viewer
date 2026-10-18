import {
  writeWorkbookAsync,
  type DiffError,
  type Workbook,
} from '@mojro/excel-diff-core';
import { downloadBlob } from '../csv/download-blob.js';

/**
 * One-shot XLSX export: write bytes then trigger a browser download.
 * Inline (not a hook) — export has no cross-render lifecycle to manage.
 */
export async function runXlsxExport(
  workbook: Workbook,
  filename: string,
  options?: {
    readonly filenameHint?: string;
    readonly onError?: (error: DiffError) => void;
  },
): Promise<DiffError | undefined> {
  const result = await writeWorkbookAsync(workbook, {
    filenameHint: options?.filenameHint ?? filename,
  });
  if (!result.ok) {
    options?.onError?.(result.error);
    return result.error;
  }
  downloadBlob(result.value, filename);
  return undefined;
}
