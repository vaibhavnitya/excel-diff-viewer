'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

function collectHeadings(): TocItem[] {
  const nodes = document.querySelectorAll(
    '[data-docs-content] h2[id], [data-docs-content] h3[id]',
  );
  return Array.from(nodes).map((node) => ({
    id: node.id,
    text: node.textContent?.trim() ?? node.id,
    level: node.tagName === 'H3' ? 3 : 2,
  }));
}

export function DocsToc({ className }: { className?: string }) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const update = () => setItems(collectHeadings());
    update();

    const content = document.querySelector('[data-docs-content]');
    if (!content) return;

    const observer = new MutationObserver(update);
    observer.observe(content, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (items.length === 0) return;

    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el != null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        On this page
      </p>
    );
  }

  return (
    <nav aria-label="On this page" className={cn('space-y-2', className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-1.5 border-l border-border">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                'block border-l-2 py-0.5 text-sm transition-colors',
                item.level === 3 ? 'pl-5' : 'pl-3',
                activeId === item.id
                  ? '-ml-px border-foreground font-medium text-foreground'
                  : '-ml-px border-transparent text-muted-foreground hover:text-foreground',
              )}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                });
                setActiveId(item.id);
                window.history.replaceState(null, '', `#${item.id}`);
              }}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
