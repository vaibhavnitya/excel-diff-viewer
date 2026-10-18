'use client';

import type { OverlaySchema } from '@mojro/excel-diff-core';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export type OverlaySchemaEditorProps = {
  schema: OverlaySchema;
  onApply: (schema: OverlaySchema) => void;
  className?: string;
};

type EditableRulesSchema = {
  join: OverlaySchema['join'];
  compose: { kind: 'rules'; rules: Extract<
    OverlaySchema['compose'],
    { kind: 'rules' }
  >['rules'] };
  passthrough?: OverlaySchema['passthrough'];
};

type EditableFnShell = {
  join: OverlaySchema['join'];
  compose: { kind: 'fn'; note?: string };
  passthrough?: OverlaySchema['passthrough'];
};

function toEditorText(schema: OverlaySchema): string {
  if (schema.compose.kind === 'rules') {
    const payload: EditableRulesSchema = {
      join: schema.join,
      compose: schema.compose,
      passthrough: schema.passthrough ?? 'all',
    };
    return JSON.stringify(payload, null, 2);
  }
  const payload: EditableFnShell = {
    join: schema.join,
    compose: {
      kind: 'fn',
      note: 'ComposeFn is fixed for this fixture. Edit join / passthrough only, then Apply.',
    },
    passthrough: schema.passthrough ?? 'all',
  };
  return JSON.stringify(payload, null, 2);
}

function parseAppliedSchema(
  text: string,
  current: OverlaySchema,
): { ok: true; schema: OverlaySchema } | { ok: false; message: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, message: 'Invalid JSON — fix the syntax and try again.' };
  }

  if (parsed === null || typeof parsed !== 'object') {
    return { ok: false, message: 'Schema must be a JSON object.' };
  }

  const obj = parsed as Record<string, unknown>;
  const join = obj.join;
  if (
    join === null ||
    typeof join !== 'object' ||
    !Array.isArray((join as { base?: unknown }).base) ||
    !Array.isArray((join as { overlay?: unknown }).overlay)
  ) {
    return {
      ok: false,
      message: 'join.base and join.overlay must be string arrays.',
    };
  }

  const passthrough = (obj.passthrough ?? 'all') as OverlaySchema['passthrough'];
  const compose = obj.compose;

  if (
    compose !== null &&
    typeof compose === 'object' &&
    (compose as { kind?: string }).kind === 'fn'
  ) {
    if (current.compose.kind !== 'fn') {
      return {
        ok: false,
        message:
          'This draft uses kind "fn" but the current schema is rules-based. Use a rules compose block, or load the Real fixture.',
      };
    }
    return {
      ok: true,
      schema: {
        join: join as OverlaySchema['join'],
        compose: current.compose,
        passthrough,
      },
    };
  }

  if (
    compose === null ||
    typeof compose !== 'object' ||
    (compose as { kind?: string }).kind !== 'rules' ||
    !Array.isArray((compose as { rules?: unknown }).rules)
  ) {
    return {
      ok: false,
      message: 'compose must be { kind: "rules", rules: [...] } (or fn shell for the Real fixture).',
    };
  }

  return {
    ok: true,
    schema: {
      join: join as OverlaySchema['join'],
      compose: {
        kind: 'rules',
        rules: (compose as { rules: EditableRulesSchema['compose']['rules'] })
          .rules,
      },
      passthrough,
    },
  };
}

/**
 * Demo-only editable overlay schema (JSON). Rules compose is fully editable;
 * fn compose keeps the function and only applies join / passthrough edits.
 */
export function OverlaySchemaEditor({
  schema,
  onApply,
  className,
}: OverlaySchemaEditorProps) {
  const [text, setText] = useState(() => toEditorText(schema));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(toEditorText(schema));
    setError(null);
  }, [schema]);

  const handleApply = (): void => {
    const result = parseAppliedSchema(text, schema);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    onApply(result.schema);
  };

  const handleReset = (): void => {
    setText(toEditorText(schema));
    setError(null);
  };

  return (
    <Card className={className}>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium">Schema</h2>
            <p className="text-xs text-muted-foreground">
              Uploads get an assisted default (join on first columns, percentIncrease
              on second). Edit the JSON and Apply to re-run overlay.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleReset}>
              Reset draft
            </Button>
            <Button type="button" size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
        <textarea
          className="min-h-[220px] w-full rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed"
          value={text}
          spellCheck={false}
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
          }}
          aria-label="Overlay schema JSON"
        />
        {error !== null ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
