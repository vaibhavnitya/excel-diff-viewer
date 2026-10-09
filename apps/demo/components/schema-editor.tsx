'use client';

import { HelpCircle } from 'lucide-react';
import { useId, useState } from 'react';
import type { DiffSchema } from '@your-scope/excel-diff-core';

import { MultiSelect } from '@/components/multi-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface SchemaEditorProps {
  headers: readonly string[] | null;
  schema: DiffSchema | null;
  onSchemaChange: (schema: DiffSchema) => void;
  inferredSchema?: DiffSchema | null;
  className?: string;
}

const DEFAULT_ABSOLUTE = 1e-6;
const DEFAULT_RELATIVE = 1e-9;

function schemasEqual(a: DiffSchema | null, b: DiffSchema | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return JSON.stringify(normalizeForCompare(a)) === JSON.stringify(normalizeForCompare(b));
}

function normalizeForCompare(schema: DiffSchema) {
  const tolerance =
    typeof schema.numericTolerance === 'number'
      ? { absolute: schema.numericTolerance, relative: DEFAULT_RELATIVE }
      : {
          absolute: schema.numericTolerance?.absolute ?? DEFAULT_ABSOLUTE,
          relative: schema.numericTolerance?.relative ?? DEFAULT_RELATIVE,
        };
  return {
    keyFields: [...schema.keyFields],
    valueFields: [...schema.valueFields],
    optionalKeyFields: [...(schema.optionalKeyFields ?? [])].sort(),
    numericTolerance: tolerance,
  };
}

function readTolerance(schema: DiffSchema | null): {
  absolute: number;
  relative: number;
} {
  const input = schema?.numericTolerance;
  if (typeof input === 'number') {
    return { absolute: input, relative: DEFAULT_RELATIVE };
  }
  return {
    absolute: input?.absolute ?? DEFAULT_ABSOLUTE,
    relative: input?.relative ?? DEFAULT_RELATIVE,
  };
}

export function SchemaEditor({
  headers,
  schema,
  onSchemaChange,
  inferredSchema = null,
  className,
}: SchemaEditorProps) {
  const keysId = useId();
  const valuesId = useId();
  const [showAdvancedTolerance, setShowAdvancedTolerance] = useState(false);

  if (!headers) {
    return (
      <div
        className={cn(
          'rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground',
          className,
        )}
      >
        Upload File A to configure schema
      </div>
    );
  }

  const keyFields = schema?.keyFields ?? [];
  const valueFields = schema?.valueFields ?? [];
  const optionalKeyFields = new Set(schema?.optionalKeyFields ?? []);
  const tolerance = readTolerance(schema);
  const valueOptions = headers.filter((header) => !keyFields.includes(header));
  const isValid = keyFields.length > 0;
  const canReset =
    inferredSchema != null && !schemasEqual(schema, inferredSchema);

  const emit = (next: DiffSchema) => {
    onSchemaChange(next);
  };

  const updateKeys = (nextKeys: string[]) => {
    const nextOptional = nextKeys.filter((key) => optionalKeyFields.has(key));
    const nextValues = valueFields.filter((field) => !nextKeys.includes(field));
    emit({
      keyFields: nextKeys,
      valueFields: nextValues,
      optionalKeyFields: nextOptional.length > 0 ? nextOptional : undefined,
      numericTolerance: {
        absolute: tolerance.absolute,
        relative: tolerance.relative,
      },
    });
  };

  const updateValues = (nextValues: string[]) => {
    emit({
      keyFields,
      valueFields: nextValues,
      optionalKeyFields:
        optionalKeyFields.size > 0 ? [...optionalKeyFields] : undefined,
      numericTolerance: {
        absolute: tolerance.absolute,
        relative: tolerance.relative,
      },
    });
  };

  const toggleOptional = (key: string, checked: boolean) => {
    const next = new Set(optionalKeyFields);
    if (checked) next.add(key);
    else next.delete(key);
    emit({
      keyFields,
      valueFields,
      optionalKeyFields: next.size > 0 ? [...next] : undefined,
      numericTolerance: {
        absolute: tolerance.absolute,
        relative: tolerance.relative,
      },
    });
  };

  const updateTolerance = (absolute: number, relative: number) => {
    emit({
      keyFields,
      valueFields,
      optionalKeyFields:
        optionalKeyFields.size > 0 ? [...optionalKeyFields] : undefined,
      numericTolerance: { absolute, relative },
    });
  };

  return (
    <TooltipProvider>
      <div className={cn('space-y-4 rounded-lg border p-4', className)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Diff Schema</h3>
          {canReset ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (inferredSchema) emit(inferredSchema);
              }}
            >
              Reset to inferred
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={keysId}>Key fields</Label>
          <MultiSelect
            id={keysId}
            options={headers}
            value={keyFields}
            onChange={updateKeys}
            placeholder="Select key columns…"
          />
          {keyFields.length > 0 ? (
            <ul className="space-y-2 pt-1">
              {keyFields.map((key) => {
                const checkboxId = `${keysId}-opt-${key}`;
                return (
                  <li key={key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      id={checkboxId}
                      checked={optionalKeyFields.has(key)}
                      onCheckedChange={(state) =>
                        toggleOptional(key, state === true)
                      }
                    />
                    <Label htmlFor={checkboxId} className="font-normal">
                      Optional for <span className="font-medium">{key}</span>{' '}
                      (treat blank as wildcard)
                    </Label>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor={valuesId}>Value fields</Label>
          <MultiSelect
            id={valuesId}
            options={valueOptions}
            value={valueFields}
            onChange={updateValues}
            placeholder="Select value columns…"
            emptyLabel="No remaining columns"
          />
          {valueFields.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Leave empty to compare all non-key headers (library default).
            </p>
          ) : null}
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label>Numeric tolerance</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Numeric tolerance help"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Numbers are equal if |a-b| &lt;= max(absolute, relative *
                max(|a|, |b|))
              </TooltipContent>
            </Tooltip>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto h-7 px-2 text-xs"
              onClick={() => setShowAdvancedTolerance((v) => !v)}
            >
              {showAdvancedTolerance ? 'Hide advanced' : 'Advanced'}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${keysId}-abs`} className="text-xs">
                Absolute
              </Label>
              <Input
                id={`${keysId}-abs`}
                type="number"
                step="any"
                value={tolerance.absolute}
                onChange={(event) => {
                  const absolute = Number(event.target.value);
                  if (Number.isFinite(absolute)) {
                    updateTolerance(absolute, tolerance.relative);
                  }
                }}
              />
            </div>
            {showAdvancedTolerance ? (
              <div className="space-y-1.5">
                <Label htmlFor={`${keysId}-rel`} className="text-xs">
                  Relative
                </Label>
                <Input
                  id={`${keysId}-rel`}
                  type="number"
                  step="any"
                  value={tolerance.relative}
                  onChange={(event) => {
                    const relative = Number(event.target.value);
                    if (Number.isFinite(relative)) {
                      updateTolerance(tolerance.absolute, relative);
                    }
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>

        {!isValid ? (
          <Alert variant="destructive">
            <AlertDescription>
              Select at least one key field before running a diff.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
