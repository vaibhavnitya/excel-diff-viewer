import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type LiveDemoProps = {
  href: string;
  children?: ReactNode;
  className?: string;
};

export function LiveDemo({
  href,
  children = 'Try it live →',
  className,
}: LiveDemoProps) {
  return (
    <div className={cn('my-6', className)}>
      <Button asChild>
        <Link href={href}>{children}</Link>
      </Button>
    </div>
  );
}
