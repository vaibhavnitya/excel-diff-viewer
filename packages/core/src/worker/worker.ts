/// <reference lib="webworker" />

import { diffWorkbooksAsync } from '../diff/diff-workbooks.js';
import { createDiffError } from '../errors.js';
import { parseFile } from '../parsers/parse-file.js';
import { err } from '../result.js';
import type { MessageRequest, MessageResponse } from './protocol.js';

declare const self: DedicatedWorkerGlobalScope;

/** Correlation ids that have been cancelled and should stop between chunks. */
const cancelledIds = new Set<string>();

/** Currently running request id (for cancel race with completion). */
let activeCorrelationId: string | null = null;

function post(message: MessageResponse): void {
  self.postMessage(message);
}

function pct(processed: number, total: number): number {
  if (total <= 0) {
    return 100;
  }
  return Math.min(100, Math.max(0, Math.round((processed / total) * 100)));
}

async function handleParse(request: Extract<MessageRequest, { type: 'parse' }>): Promise<void> {
  const { correlationId, input, options } = request;
  activeCorrelationId = correlationId;
  try {
    if (cancelledIds.has(correlationId)) {
      cancelledIds.delete(correlationId);
      post({
        type: 'result',
        correlationId,
        value: err(createDiffError('CANCELLED', 'Parse was cancelled before completion.')),
      });
      return;
    }
    const value = await parseFile(input, options);
    if (cancelledIds.has(correlationId)) {
      cancelledIds.delete(correlationId);
      post({
        type: 'result',
        correlationId,
        value: err(createDiffError('CANCELLED', 'Parse was cancelled before completion.')),
      });
      return;
    }
    post({ type: 'result', correlationId, value });
  } catch (cause) {
    post({
      type: 'error',
      correlationId,
      message: cause instanceof Error ? cause.message : String(cause),
    });
  } finally {
    if (activeCorrelationId === correlationId) {
      activeCorrelationId = null;
    }
    cancelledIds.delete(correlationId);
  }
}

async function handleDiff(request: Extract<MessageRequest, { type: 'diff' }>): Promise<void> {
  const { correlationId, a, b, schema } = request;
  activeCorrelationId = correlationId;
  try {
    if (cancelledIds.has(correlationId)) {
      cancelledIds.delete(correlationId);
      post({
        type: 'result',
        correlationId,
        value: err(createDiffError('CANCELLED', 'Diff was cancelled before completion.')),
      });
      return;
    }

    const value = await diffWorkbooksAsync(
      a,
      b,
      { schema },
      {
        isCancelled: () => cancelledIds.has(correlationId),
        onProgress: (processed, total) => {
          post({
            type: 'progress',
            correlationId,
            pct: pct(processed, total),
          });
        },
      },
    );

    if (cancelledIds.has(correlationId) && value.ok) {
      cancelledIds.delete(correlationId);
      post({
        type: 'result',
        correlationId,
        value: err(createDiffError('CANCELLED', 'Diff was cancelled before completion.')),
      });
      return;
    }

    post({ type: 'result', correlationId, value });
  } catch (cause) {
    post({
      type: 'error',
      correlationId,
      message: cause instanceof Error ? cause.message : String(cause),
    });
  } finally {
    if (activeCorrelationId === correlationId) {
      activeCorrelationId = null;
    }
    cancelledIds.delete(correlationId);
  }
}

self.onmessage = (event: MessageEvent<MessageRequest>): void => {
  const request = event.data;
  if (request == null || typeof request !== 'object' || !('type' in request)) {
    return;
  }

  switch (request.type) {
    case 'cancel': {
      cancelledIds.add(request.correlationId);
      break;
    }
    case 'parse': {
      void handleParse(request);
      break;
    }
    case 'diff': {
      void handleDiff(request);
      break;
    }
    default: {
      const _exhaustive: never = request;
      void _exhaustive;
      break;
    }
  }
};
