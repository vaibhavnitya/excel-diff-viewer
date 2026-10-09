import type { ReactNode } from 'react';

import { DocsMobileNav } from '@/components/docs/docs-mobile-nav';
import { DocsSidebar } from '@/components/docs/docs-sidebar';
import { DocsToc } from '@/components/docs/docs-toc';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 py-8 sm:px-6">
      <aside className="sticky top-20 hidden h-[calc(100vh-5.5rem)] w-56 shrink-0 overflow-y-auto lg:block">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Documentation
        </p>
        <DocsSidebar />
      </aside>

      <div className="min-w-0 flex-1">
        <DocsMobileNav />
        <article
          data-docs-content
          className="docs-prose max-w-3xl pb-16"
        >
          {children}
        </article>
      </div>

      <aside className="sticky top-20 hidden h-[calc(100vh-5.5rem)] w-48 shrink-0 overflow-y-auto xl:block">
        <DocsToc />
      </aside>
    </div>
  );
}
