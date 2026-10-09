import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { Callout } from '@/components/docs/callout';
import { CodeBlock } from '@/components/docs/code-block';
import { Install } from '@/components/docs/install';
import { LiveDemo } from '@/components/docs/live-demo';
import { PropsTable } from '@/components/docs/props-table';
import { cn } from '@/lib/utils';

type HeadingProps = ComponentPropsWithoutRef<'h2'> & { id?: string };

function heading(
  Tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
  className: string,
) {
  return function Heading({ id, className: extra, children, ...props }: HeadingProps) {
    return (
      <Tag
        id={id}
        className={cn('scroll-mt-24 font-semibold tracking-tight', className, extra)}
        {...props}
      >
        {children}
      </Tag>
    );
  };
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: heading('h1', 'mb-4 mt-2 text-3xl'),
    h2: heading('h2', 'mb-3 mt-10 border-b pb-2 text-2xl'),
    h3: heading('h3', 'mb-2 mt-8 text-xl'),
    h4: heading('h4', 'mb-2 mt-6 text-lg'),
    h5: heading('h5', 'mb-2 mt-4 text-base'),
    h6: heading('h6', 'mb-2 mt-4 text-sm'),
    p: ({ children, ...props }) => (
      <p className="my-4 leading-relaxed text-muted-foreground" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }) => (
      <ul className="my-4 list-disc space-y-2 pl-6 text-muted-foreground" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="my-4 list-decimal space-y-2 pl-6 text-muted-foreground" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="leading-relaxed [&>p]:my-0" {...props}>
        {children}
      </li>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="my-4 border-l-4 border-border pl-4 italic text-muted-foreground"
        {...props}
      >
        {children}
      </blockquote>
    ),
    a: ({ href, children, ...props }) => {
      if (!href) {
        return <span {...props}>{children}</span>;
      }
      const external = href.startsWith('http');
      if (external) {
        return (
          <a
            href={href}
            className="font-medium text-foreground underline underline-offset-4 hover:opacity-80"
            target="_blank"
            rel="noreferrer"
            {...props}
          >
            {children}
          </a>
        );
      }
      return (
        <Link
          href={href}
          className="font-medium text-foreground underline underline-offset-4 hover:opacity-80"
          {...props}
        >
          {children}
        </Link>
      );
    },
    code: ({ children, className, ...props }) => {
      const isBlock = Boolean(className);
      if (isBlock) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }
      return (
        <code
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }) => (
      <pre
        className="my-6 overflow-x-auto rounded-lg border bg-muted/60 p-4 text-sm leading-relaxed"
        {...props}
      >
        {children}
      </pre>
    ),
    table: ({ children, ...props }) => (
      <div className="my-6 overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead className="border-b bg-muted/50" {...props}>
        {children}
      </thead>
    ),
    th: ({ children, ...props }) => (
      <th className="px-3 py-2 text-left font-medium text-foreground" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="border-b px-3 py-2 align-top text-muted-foreground" {...props}>
        {children}
      </td>
    ),
    hr: (props) => <hr className="my-10 border-border" {...props} />,
    Callout,
    PropsTable,
    LiveDemo,
    Install,
    CodeBlock,
    ...components,
  };
}

export type { ReactNode };
