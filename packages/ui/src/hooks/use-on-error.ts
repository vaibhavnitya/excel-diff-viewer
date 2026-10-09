import { useEffect, useRef } from 'react';
import type { DiffError } from '@your-scope/excel-diff-core';

export function useOnError(
  error: DiffError | undefined,
  onError: ((error: DiffError) => void) | undefined,
): void {
  const lastCode = useRef<string | null>(null);

  useEffect(() => {
    if (error === undefined) {
      lastCode.current = null;
      return;
    }
    const signature = `${error.code}:${error.message}`;
    if (lastCode.current === signature) {
      return;
    }
    lastCode.current = signature;
    onError?.(error);
  }, [error, onError]);
}
