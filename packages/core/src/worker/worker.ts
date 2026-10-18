/// <reference lib="webworker" />

import { diffWorkbooksAsync } from '../diff/diff-workbooks.js';
import { createDiffError } from '../errors.js';
import { overlayWorkbooksAsyncForWorker } from '../overlay/overlay.js';
import { fromSerializableOverlayOptions } from '../overlay/serializable-schema.js';
import { parseFile } from '../parsers/parse-file.js';
import { err, ok } from '../result.js';
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

async function handleOverlay(
  request: Extract<MessageRequest, { type: 'overlay' }>,
): Promise<void> {
  const { correlationId, base, overlay, options } = request;
  activeCorrelationId = correlationId;
  try {
    if (cancelledIds.has(correlationId)) {
      cancelledIds.delete(correlationId);
      post({
        type: 'result',
        correlationId,
        value: err(createDiffError('CANCELLED', 'Overlay was cancelled before completion.')),
      });
      return;
    }

    const engineOptions = fromSerializableOverlayOptions(options);
    const outcome = await overlayWorkbooksAsyncForWorker(
      base,
      overlay,
      engineOptions,
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

    if (cancelledIds.has(correlationId) && outcome.ok) {
      cancelledIds.delete(correlationId);
      post({
        type: 'result',
        correlationId,
        value: err(createDiffError('CANCELLED', 'Overlay was cancelled before completion.')),
      });
      return;
    }

    if (!outcome.ok) {
      post({ type: 'result', correlationId, value: outcome });
      return;
    }

    if (outcome.value.kind === 'result') {
      post({
        type: 'result',
        correlationId,
        value: ok({ kind: 'result', value: outcome.value.value }),
      });
      return;
    }

    // Strip schema (may contain stub fn) before posting.
    const { schema: _schema, ...wire } = outcome.value.value;
    void _schema;
    post({
      type: 'result',
      correlationId,
      value: ok({
        kind: 'fn-pairs',
        pairs: wire.pairs,
        baseHeaders: wire.baseHeaders,
        overlayHeaders: wire.overlayHeaders,
        summary: wire.summary,
        sheetName: wire.sheetName,
        baseFilename: wire.baseFilename,
      }),
    });
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
    case 'overlay': {
      void handleOverlay(request);
      break;
    }
    default: {
      const _exhaustive: never = request;
      void _exhaustive;
      break;
    }
  }
};
