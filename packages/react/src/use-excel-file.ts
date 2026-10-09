import { useEffect, useState } from 'react';
import { createProgressThrottle } from './internal/progress-throttle.js';
import { resolveFilename, toArrayBuffer } from './internal/to-array-buffer.js';
import { useWorkerClient } from './internal/use-worker-client.js';
import type { FileState, UseExcelFileOptions } from './types.js';

/**
 * Parse a single Excel/CSV file on a dedicated Worker.
 * Pass `null` for idle. Changing `file` cancels in-flight work (latest-wins).
 */
export function useExcelFile(
  file: File | ArrayBuffer | null,
  options?: UseExcelFileOptions,
): FileState {
  const [state, setState] = useState<FileState>({ status: 'idle' });
  const { getClient, generationRef } = useWorkerClient();

  const filename = options?.filename;
  const format = options?.format;
  const limits = options?.limits;

  useEffect(() => {
    if (file === null) {
      setState({ status: 'idle' });
      return;
    }

    const runId = ++generationRef.current;
    const client = getClient();
    setState({ status: 'loading', progress: 0 });

    const throttle = createProgressThrottle((pct) => {
      if (runId !== generationRef.current) {
        return;
      }
      setState({ status: 'loading', progress: pct });
    });

    const unsubscribe = client.onProgress((progress) => {
      if (runId !== generationRef.current) {
        return;
      }
      throttle.push(progress.pct);
    });

    void (async () => {
      try {
        const buffer = await toArrayBuffer(file);
        if (runId !== generationRef.current) {
          return;
        }

        const result = await client.parse(buffer, {
          filename: resolveFilename(file, filename),
          format,
          limits,
        });

        if (runId !== generationRef.current) {
          return;
        }

        if (!result.ok) {
          if (result.error.code === 'CANCELLED') {
            return;
          }
          throttle.cancel();
          setState({ status: 'error', error: result.error });
          return;
        }

        throttle.push(100);
        setState({ status: 'success', workbook: result.value });
      } catch (cause) {
        if (runId !== generationRef.current) {
          return;
        }
        throttle.cancel();
        setState({
          status: 'error',
          error: {
            code: 'PARSE_ERROR',
            message:
              cause instanceof Error
                ? cause.message
                : 'Failed to read file bytes.',
            details: { cause: String(cause) },
          },
        });
      }
    })();

    return () => {
      generationRef.current += 1;
      throttle.cancel();
      unsubscribe();
      client.cancel();
    };
  }, [file, filename, format, limits, getClient, generationRef]);

  return state;
}
