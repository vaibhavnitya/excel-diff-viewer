/**
 * Embedded Worker bundle text for Blob URL construction.
 * At build time tsup `define`s `__EMBEDDED_WORKER__` to the contents of the
 * intermediate worker bundle. Vitest browser config injects the same define
 * so tests exercise the published Blob URL path.
 */
declare const __EMBEDDED_WORKER__: string | undefined;

export const WORKER_SOURCE: string =
  typeof __EMBEDDED_WORKER__ !== 'undefined' ? __EMBEDDED_WORKER__ : '';
