'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { DOCS_NAV, type DocsNavItem } from '@/lib/docs-nav';
import { cn } from '@/lib/utils';

function NavLink({
  item,
  pathname,
  onNavigate,
  nested,
}: {
  item: DocsNavItem;
  pathname: string;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const active =
    item.href === '/docs'
      ? pathname === '/docs'
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <div>
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'block rounded-md px-3 py-2 text-sm transition-colors',
          nested && 'pl-6 text-[0.8125rem]',
          active
            ? 'bg-accent font-medium text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        )}
        aria-current={pathname === item.href ? 'page' : undefined}
      >
        {item.title}
      </Link>
      {item.children ? (
        <div className="mt-0.5 space-y-0.5">
          {item.children.map((child) => (
            <NavLink
              key={child.href}
              item={child}
              pathname={pathname}
              onNavigate={onNavigate}
              nested
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Docs" className="space-y-1">
      {DOCS_NAV.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
