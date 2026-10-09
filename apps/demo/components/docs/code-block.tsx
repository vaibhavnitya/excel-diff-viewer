'use client';

import { Check, Copy } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CodeBlockProps = {
  lang?: string;
  children: ReactNode;
  className?: string;
};

export function CodeBlock({ lang, children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const text =
    typeof children === 'string'
      ? children
      : Array.isArray(children)
        ? children.join('')
        : String(children ?? '');

  return (
    <div className={cn('group relative my-6', className)}>
      {lang ? (
        <div className="absolute left-3 top-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          {lang}
        </div>
      ) : null}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label={copied ? 'Copied' : 'Copy code'}
        onClick={async () => {
          await navigator.clipboard.writeText(text.trim());
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <pre className="overflow-x-auto rounded-lg border bg-muted/60 p-4 pt-8 text-sm leading-relaxed">
        <code>{text}</code>
      </pre>
    </div>
  );
}
