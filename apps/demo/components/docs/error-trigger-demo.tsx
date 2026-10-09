'use client';

import type { DiffError, DiffErrorCode, DiffSchema } from '@your-scope/excel-diff-core';
import { ExcelDiffViewer, ExcelViewer } from '@your-scope/excel-diff-ui';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  getBlankKeyFile,
  getDuplicateKeysFile,
  getManyRowsCsvFile,
  getOversizedCsvFile,
  getSampleFileA,
  getSampleFileB,
  getUnsupportedFile,
  getWideCsvFile,
  SAMPLE_SCHEMA,
} from '@/lib/sample-data';

type Trigger =
  | {
      code: DiffErrorCode;
      label: string;
      mode: 'viewer';
      file: () => File;
      limits?: Partial<{
        maxFileSizeBytes: number;
        maxRows: number;
        maxColumns: number;
        maxCells: number;
      }>;
    }
  | {
      code: DiffErrorCode;
      label: string;
      mode: 'diff';
      fileA: () => File;
      fileB: () => File;
      schema: DiffSchema | null;
      limits?: Partial<{
        maxFileSizeBytes: number;
        maxRows: number;
        maxColumns: number;
        maxCells: number;
      }>;
    }
  | {
      code: DiffErrorCode;
      label: string;
      mode: 'message';
      message: string;
    };

const TRIGGERS: readonly Trigger[] = [
  {
    code: 'FILE_TOO_LARGE',
    label: 'FILE_TOO_LARGE',
    mode: 'viewer',
    file: () => getOversizedCsvFile(4096),
    limits: { maxFileSizeBytes: 512 },
  },
  {
    code: 'TOO_MANY_ROWS',
    label: 'TOO_MANY_ROWS',
    mode: 'viewer',
    file: () => getManyRowsCsvFile(20),
    limits: { maxRows: 5 },
  },
  {
    code: 'TOO_MANY_COLUMNS',
    label: 'TOO_MANY_COLUMNS',
    mode: 'viewer',
    file: () => getWideCsvFile(12),
    limits: { maxColumns: 3 },
  },
  {
    code: 'TOO_MANY_CELLS',
    label: 'TOO_MANY_CELLS',
    mode: 'viewer',
    file: () => getManyRowsCsvFile(30),
    limits: { maxCells: 40 },
  },
  {
    code: 'UNSUPPORTED_FORMAT',
    label: 'UNSUPPORTED_FORMAT',
    mode: 'viewer',
    file: () => getUnsupportedFile(),
  },
  {
    code: 'PARSE_ERROR',
    label: 'PARSE_ERROR',
    mode: 'viewer',
    file: () =>
      new File(['\u0000\u0001not a real workbook'], 'broken.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
  },
  {
    code: 'INVALID_SCHEMA',
    label: 'INVALID_SCHEMA',
    mode: 'diff',
    fileA: () => getBlankKeyFile(),
    fileB: () => getSampleFileB(),
    schema: {
      keyFields: ['origin', 'destination', 'mode'],
      valueFields: ['rate'],
    },
  },
  {
    code: 'DUPLICATE_KEYS',
    label: 'DUPLICATE_KEYS',
    mode: 'diff',
    fileA: () => getDuplicateKeysFile(),
    fileB: () => getSampleFileB(),
    schema: SAMPLE_SCHEMA,
  },
  {
    code: 'SCHEMA_INFERENCE_FAILED',
    label: 'SCHEMA_INFERENCE_FAILED',
    mode: 'message',
    message:
      'Fired by inferSchema when headers cannot yield key fields. Pass an explicit schema instead of relying on inference.',
  },
  {
    code: 'WORKER_UNAVAILABLE',
    label: 'WORKER_UNAVAILABLE',
    mode: 'message',
    message:
      'Surfaced when Worker construction fails (blocked environments). Hard to force in this demo sandbox.',
  },
  {
    code: 'WORKER_CRASHED',
    label: 'WORKER_CRASHED',
    mode: 'message',
    message:
      'Surfaced when the Worker terminates unexpectedly. Retry with a smaller file if it persists.',
  },
  {
    code: 'CANCELLED',
    label: 'CANCELLED',
    mode: 'message',
    message:
      'Returned when a newer request cancels in-flight work (latest-wins). Usually transient — not shown as a sticky UI error.',
  },
] as const;

export function ErrorTriggerDemo() {
  const [active, setActive] = useState<DiffErrorCode>('FILE_TOO_LARGE');
  const [lastError, setLastError] = useState<DiffError | null>(null);
  const sampleA = useMemo(() => getSampleFileA(), []);
  const trigger =
    TRIGGERS.find((item) => item.code === active) ?? TRIGGERS[0]!;

  const prepared = useMemo(() => {
    if (trigger.mode === 'viewer') {
      return {
        mode: 'viewer' as const,
        file: trigger.file(),
        limits: trigger.limits,
        code: trigger.code,
      };
    }
    if (trigger.mode === 'diff') {
      return {
        mode: 'diff' as const,
        fileA: trigger.fileA(),
        fileB: trigger.fileB(),
        schema: trigger.schema,
        limits: trigger.limits,
        code: trigger.code,
      };
    }
    return { mode: 'message' as const, code: trigger.code, message: trigger.message };
  }, [trigger]);

  return (
    <div className="my-8 space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap gap-2">
        {TRIGGERS.map((item) => (
          <Button
            key={item.code}
            type="button"
            size="sm"
            variant={item.code === active ? 'default' : 'outline'}
            onClick={() => {
              setLastError(null);
              setActive(item.code);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {lastError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          <span className="font-mono font-medium">{lastError.code}</span>
          {': '}
          {lastError.message}
        </p>
      ) : null}

      <div className="min-h-[220px] overflow-hidden rounded-md border">
        {prepared.mode === 'message' ? (
          <div className="space-y-2 p-4 text-sm text-muted-foreground">
            <p className="font-mono text-foreground">{prepared.code}</p>
            <p>{prepared.message}</p>
            <p>
              Happy-path sample still loads below so you can compare with a
              working viewer:
            </p>
            <ExcelViewer
              file={sampleA}
              height={180}
              onError={setLastError}
            />
          </div>
        ) : null}

        {prepared.mode === 'viewer' ? (
          <ExcelViewer
            key={prepared.code}
            file={prepared.file}
            height={220}
            limits={prepared.limits}
            onError={setLastError}
          />
        ) : null}

        {prepared.mode === 'diff' ? (
          <ExcelDiffViewer
            key={prepared.code}
            fileA={prepared.fileA}
            fileB={prepared.fileB}
            schema={prepared.schema}
            height={220}
            limits={prepared.limits}
            onError={setLastError}
          />
        ) : null}
      </div>
    </div>
  );
}
