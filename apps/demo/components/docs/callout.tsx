import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const styles = {
  info: 'border-sky-500/40 bg-sky-500/10 text-foreground',
  tip: 'border-emerald-500/40 bg-emerald-500/10 text-foreground',
  warn: 'border-amber-500/40 bg-amber-500/10 text-foreground',
  danger: 'border-red-500/40 bg-red-500/10 text-foreground',
} as const;

const labels = {
  info: 'Note',
  tip: 'Tip',
  warn: 'Warning',
  danger: 'Danger',
} as const;

export type CalloutProps = {
  type?: keyof typeof styles;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Callout({
  type = 'info',
  title,
  children,
  className,
}: CalloutProps) {
  return (
    <aside
      className={cn(
        'my-6 rounded-lg border px-4 py-3 text-sm leading-relaxed',
        styles[type],
        className,
      )}
      data-callout={type}
    >
      <p className="mb-1 font-semibold text-foreground">
        {title ?? labels[type]}
      </p>
      <div className="text-muted-foreground [&>p]:my-2 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
        {children}
      </div>
    </aside>
  );
}
