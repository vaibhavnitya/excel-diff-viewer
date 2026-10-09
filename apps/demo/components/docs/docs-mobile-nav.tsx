'use client';

import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { DocsSidebar } from '@/components/docs/docs-sidebar';
import { DocsToc } from '@/components/docs/docs-toc';
import { Button } from '@/components/ui/button';
import { docsTitleForPath } from '@/lib/docs-nav';

export function DocsMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  return (
    <div className="mb-6 space-y-3 lg:hidden">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          Docs
        </Button>
        <span className="truncate text-sm text-muted-foreground">
          {docsTitleForPath(pathname)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => setTocOpen((value) => !value)}
          aria-expanded={tocOpen}
        >
          On this page
        </Button>
      </div>
      {open ? (
        <div className="rounded-lg border p-3">
          <DocsSidebar onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
      {tocOpen ? (
        <div className="rounded-lg border p-3">
          <DocsToc />
        </div>
      ) : null}
    </div>
  );
}
