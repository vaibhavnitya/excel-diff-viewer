'use client';

import type { OverlaySchema } from '@mojro/excel-diff-core';
import { useExcelFile } from '@mojro/excel-diff-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  getRealShapedBaseFile,
  getRealShapedOverlayFile,
  getSimpleBaseFile,
  getSimpleOverlayFile,
  realFixtureSchema,
  simpleFixtureSchema,
} from '@/lib/overlay-sample-data';

export type OverlayFixtureId = 'none' | 'real' | 'simple';

function sheetHeaders(
  state: ReturnType<typeof useExcelFile>,
): readonly string[] | null {
  if (state.status !== 'success') return null;
  const sheet =
    state.workbook.sheets[state.workbook.activeSheetIndex] ??
    state.workbook.sheets[0];
  return sheet?.headers ?? null;
}

/**
 * Assisted default for uploaded files:
 * - join on the first column of each workbook
 * - percentIncrease using the second column of each (falls back to first)
 */
export function buildAssistedOverlaySchema(
  baseHeaders: readonly string[],
  overlayHeaders: readonly string[],
): OverlaySchema {
  const baseJoin = baseHeaders[0] ?? 'col0';
  const overlayJoin = overlayHeaders[0] ?? 'col0';
  const baseValue = baseHeaders[1] ?? baseJoin;
  const overlayValue = overlayHeaders[1] ?? overlayJoin;

  return {
    join: {
      base: [baseJoin],
      overlay: [overlayJoin],
      wildcardOnEmpty: 'overlay',
    },
    compose: {
      kind: 'rules',
      rules: [
        {
          op: 'percentIncrease',
          base: baseValue,
          overlay: overlayValue,
          target: 'Effective Rate',
          defaultWhenMissing: 0,
        },
      ],
    },
    passthrough: 'all',
  };
}

function fileKey(file: File | null): string {
  if (file === null) return '';
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/**
 * Overlay demo page state: two files, fixture presets, and assisted schema
 * seeding for manual uploads (demo-only — no library changes).
 */
export function useOverlayPageState() {
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [overlayFile, setOverlayFile] = useState<File | null>(null);
  const [fixture, setFixture] = useState<OverlayFixtureId>('none');
  const [schema, setSchema] = useState<OverlaySchema | null>(null);

  const baseState = useExcelFile(baseFile);
  const overlayState = useExcelFile(overlayFile);

  const baseHeaders = useMemo(() => sheetHeaders(baseState), [baseState]);
  const overlayHeaders = useMemo(
    () => sheetHeaders(overlayState),
    [overlayState],
  );

  const assistKey = `${fileKey(baseFile)}|${fileKey(overlayFile)}`;
  const seededForKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (fixture !== 'none') {
      return;
    }

    if (baseFile === null || overlayFile === null) {
      setSchema(null);
      seededForKeyRef.current = null;
      return;
    }

    if (
      baseHeaders === null ||
      overlayHeaders === null ||
      baseHeaders.length === 0 ||
      overlayHeaders.length === 0
    ) {
      return;
    }

    if (seededForKeyRef.current === assistKey) {
      return;
    }

    seededForKeyRef.current = assistKey;
    setSchema(buildAssistedOverlaySchema(baseHeaders, overlayHeaders));
  }, [
    fixture,
    baseFile,
    overlayFile,
    baseHeaders,
    overlayHeaders,
    assistKey,
  ]);

  const loadFixture = (id: OverlayFixtureId): void => {
    setFixture(id);
    if (id === 'real') {
      setBaseFile(getRealShapedBaseFile());
      setOverlayFile(getRealShapedOverlayFile());
      setSchema(realFixtureSchema);
      seededForKeyRef.current = null;
      return;
    }
    if (id === 'simple') {
      setBaseFile(getSimpleBaseFile());
      setOverlayFile(getSimpleOverlayFile());
      setSchema(simpleFixtureSchema);
      seededForKeyRef.current = null;
      return;
    }
    setBaseFile(null);
    setOverlayFile(null);
    setSchema(null);
    seededForKeyRef.current = null;
  };

  const onBaseFileChange = (file: File | null): void => {
    setFixture('none');
    setBaseFile(file);
    seededForKeyRef.current = null;
  };

  const onOverlayFileChange = (file: File | null): void => {
    setFixture('none');
    setOverlayFile(file);
    seededForKeyRef.current = null;
  };

  /** Apply an edited schema without re-seeding over the user's edits. */
  const applySchema = (next: OverlaySchema): void => {
    seededForKeyRef.current = assistKey;
    setSchema(next);
  };

  return {
    baseFile,
    overlayFile,
    fixture,
    schema,
    baseHeaders,
    overlayHeaders,
    loadFixture,
    onBaseFileChange,
    onOverlayFileChange,
    applySchema,
  };
}
