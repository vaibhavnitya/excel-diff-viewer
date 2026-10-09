'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { DOCS_NAV } from '@/lib/docs-nav';
import { cn } from '@/lib/utils';

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Docs" className="space-y-1">
      {DOCS_NAV.map((item) => {
        const active =
          item.href === '/docs'
            ? pathname === '/docs'
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'block rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-accent font-medium text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )}
            aria-current={active ? 'page' : undefined}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
