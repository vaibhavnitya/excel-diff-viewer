import type { CSSProperties } from 'react';

/** Three-tier height: explicit prop → fill parent (100%) → minHeight safety net. */
export function gridContainerStyle(height?: number | string): CSSProperties {
  return {
    height: height ?? '100%',
    minHeight: 400,
  };
}
