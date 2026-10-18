/** Exact header match — no case folding, no trimming (overlay schema contract). */
export function exactHeaderIndex(headers: readonly string[], name: string): number {
  return headers.indexOf(name);
}

export function formatAvailableHeaders(headers: readonly string[]): string {
  if (headers.length === 0) {
    return '(none)';
  }
  return headers.map((h) => `'${h}'`).join(', ');
}
