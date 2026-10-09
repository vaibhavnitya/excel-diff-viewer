'use client';

import { FileSpreadsheet, Upload, X } from 'lucide-react';
import { useCallback, useId, useRef, useState, type DragEvent } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface FileUploadProps {
  label: string;
  accept?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  className?: string;
}

const DEFAULT_ACCEPT = '.xlsx,.csv';

function isAcceptedFile(file: File, accept: string): boolean {
  const tokens = accept.split(',').map((t) => t.trim().toLowerCase());
  const name = file.name.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith('.')) return name.endsWith(token);
    return file.type === token;
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  label,
  accept = DEFAULT_ACCEPT,
  file,
  onFileChange,
  className,
}: FileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyFile = useCallback(
    (next: File | null) => {
      if (!next) {
        setError(null);
        onFileChange(null);
        return;
      }
      if (!isAcceptedFile(next, accept)) {
        setError(`Unsupported file type. Please choose ${accept}.`);
        return;
      }
      setError(null);
      onFileChange(next);
    },
    [accept, onFileChange],
  );

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0] ?? null;
    applyFile(dropped);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={inputId}>{label}</Label>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${label}: drop a file or click to browse`}
        className={cn(
          'relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors',
          dragging
            ? 'border-primary bg-accent/50'
            : 'border-muted-foreground/30 hover:border-muted-foreground/60 hover:bg-muted/40',
          file && 'border-solid',
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(event) => {
            applyFile(event.target.files?.[0] ?? null);
            event.target.value = '';
          }}
        />
        {file ? (
          <>
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium break-all">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(file.size)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={(event) => {
                event.stopPropagation();
                applyFile(null);
              }}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm">
              Drag and drop an Excel or CSV file, or{' '}
              <span className="font-medium underline underline-offset-2">
                browse
              </span>
            </p>
            <p className="text-xs text-muted-foreground">Accepts {accept}</p>
          </>
        )}
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
