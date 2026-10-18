/**
 * Trigger a browser download of binary bytes.
 * Lives next to {@link downloadCsv} — export is a one-shot user gesture,
 * so viewers call this inline rather than via a react hook.
 */
export function downloadBlob(bytes: ArrayBuffer, filename: string): void {
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
