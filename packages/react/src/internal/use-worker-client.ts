import { createWorker, type WorkerClient } from '@your-scope/excel-diff-core';
import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';

/**
 * One WorkerClient per hook instance: lazy create, terminate on unmount.
 * Safe under StrictMode (cleanup terminates; remount creates a fresh client).
 */
export function useWorkerClient(): {
  readonly getClient: () => WorkerClient;
  readonly generationRef: MutableRefObject<number>;
} {
  const clientRef = useRef<WorkerClient | null>(null);
  const generationRef = useRef(0);

  const getClient = useCallback((): WorkerClient => {
    if (clientRef.current === null) {
      clientRef.current = createWorker();
    }
    return clientRef.current;
  }, []);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      const client = clientRef.current;
      clientRef.current = null;
      client?.terminate();
    };
  }, []);

  return { getClient, generationRef };
}
