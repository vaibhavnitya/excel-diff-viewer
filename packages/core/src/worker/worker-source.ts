/**
 * Embedded Worker bundle text for Blob URL fallback.
 * At build time tsup `define`s `__EMBEDDED_WORKER__` to the contents of
 * `dist/worker.js`. When undefined (e.g. Vitest against `src/`), the string
 * is empty and only the `import.meta.url` Worker path works.
 */
declare const __EMBEDDED_WORKER__: string | undefined;

export const WORKER_SOURCE: string =
  typeof __EMBEDDED_WORKER__ !== 'undefined' ? __EMBEDDED_WORKER__ : '';
