'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type InstallProps = {
  packages: string;
  className?: string;
};

export function Install({ packages, className }: InstallProps) {
  const [copied, setCopied] = useState(false);
  const command = `npm install ${packages}`;

  return (
    <div
      className={cn(
        'my-6 flex items-center gap-2 rounded-lg border bg-muted/60 p-3',
        className,
      )}
    >
      <pre className="min-w-0 flex-1 overflow-x-auto text-sm">
        <code>{command}</code>
      </pre>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={copied ? 'Copied' : 'Copy install command'}
        onClick={async () => {
          await navigator.clipboard.writeText(command);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
