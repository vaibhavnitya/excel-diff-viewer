'use client';

import { inferSchema } from '@mojro/excel-diff-core';
import type { DiffSchema } from '@mojro/excel-diff-core';
import { useExcelFile } from '@mojro/excel-diff-react';
import { useEffect, useMemo, useState } from 'react';

/**
 * Shared Diff/Split page state: two files, controlled schema, and
 * auto-infer from File A headers when both files are present.
 */
export function useDiffPageState() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [schema, setSchema] = useState<DiffSchema | null>(null);
  const [inferredSchema, setInferredSchema] = useState<DiffSchema | null>(null);

  const fileAState = useExcelFile(fileA);

  const headers = useMemo(() => {
    if (fileAState.status !== 'success') return null;
    const sheet =
      fileAState.workbook.sheets[fileAState.workbook.activeSheetIndex] ??
      fileAState.workbook.sheets[0];
    return sheet?.headers ?? null;
  }, [fileAState]);

  useEffect(() => {
    if (!fileA) {
      setSchema(null);
      setInferredSchema(null);
      return;
    }

    if (!fileB || !headers || headers.length === 0) {
      setInferredSchema(null);
      return;
    }

    const result = inferSchema(headers);
    if (result.ok) {
      setInferredSchema(result.value);
      setSchema(result.value);
    } else {
      setInferredSchema(null);
      setSchema({
        keyFields: [],
        valueFields: [...headers],
      });
    }
  }, [fileA, fileB, headers]);

  return {
    fileA,
    setFileA,
    fileB,
    setFileB,
    schema,
    setSchema,
    inferredSchema,
    headers,
  };
}
