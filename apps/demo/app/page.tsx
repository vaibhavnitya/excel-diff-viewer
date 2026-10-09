import Link from 'next/link';
import { Columns2, FileSpreadsheet, GitCompare } from 'lucide-react';

import { CopyButton } from '@/components/copy-button';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const features = [
  {
    title: 'Viewer',
    href: '/viewer',
    icon: FileSpreadsheet,
    description:
      'Open an Excel or CSV file as a searchable, sortable grid with sheet tabs — no upload to a server.',
  },
  {
    title: 'Diff',
    href: '/diff',
    icon: GitCompare,
    description:
      'Compare two files by business key. Highlight added, removed, and modified cells with numeric tolerance.',
  },
  {
    title: 'Split',
    href: '/split',
    icon: Columns2,
    description:
      'Inspect before and after side by side with rows aligned on shared keys and ghost rows for gaps.',
  },
] as const;

const INSTALL =
  'npm install @mojro/excel-diff-ui @mojro/excel-diff-react @mojro/excel-diff-core react react-dom ag-grid-community ag-grid-react';

const QUICK_EXAMPLE = `'use client';

import { useState } from 'react';
import { ExcelViewer } from '@mojro/excel-diff-ui';
import '@mojro/excel-diff-ui/styles.css';

export function App() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <ExcelViewer file={file} height={600} />
    </>
  );
}`;

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-7xl flex-col px-4 py-10 sm:px-6">
      <main className="flex flex-1 flex-col gap-10">
        <section className="max-w-2xl space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Excel Diff Viewer
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            Compare and inspect Excel and CSV files in your browser. Fast,
            framework-agnostic, no backend required. Drop in a viewer, a
            key-based diff, or a split pane — powered by Web Workers so large
            rate cards stay responsive while you explore changes.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/viewer">View a file</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/diff">Compare two files</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/docs">Read the docs</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.href} className="flex flex-col">
              <CardHeader>
                <feature.icon
                  className="mb-2 h-6 w-6 text-muted-foreground"
                  aria-hidden
                />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button asChild variant="link" className="h-auto px-0">
                  <Link href={feature.href}>Open {feature.title} →</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-lg border bg-muted/30 p-6">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">
            Quick start
          </h2>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Install</p>
              <div className="flex items-start gap-2 rounded-md border bg-background p-3">
                <pre className="min-w-0 flex-1 overflow-x-auto text-xs leading-relaxed">
                  <code>{INSTALL}</code>
                </pre>
                <CopyButton text={INSTALL} />
              </div>
            </div>
            <div className="space-y-2 lg:col-span-1">
              <p className="text-sm font-medium">Minimal viewer</p>
              <pre className="max-h-56 overflow-auto rounded-md border bg-background p-3 text-xs leading-relaxed">
                <code>{QUICK_EXAMPLE}</code>
              </pre>
            </div>
            <div className="flex flex-col justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Full guides for schema, hooks, styling, and errors live in the
                docs.
              </p>
              <Button asChild variant="outline" className="w-fit">
                <Link href="/docs">Read the docs →</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-12 border-t pt-6 text-sm text-muted-foreground">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="https://github.com"
            className="underline underline-offset-4 hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub
          </a>
          <code className="rounded-md bg-muted px-2 py-1 text-xs text-foreground">
            npm install @mojro/excel-diff-ui
          </code>
        </div>
      </footer>
    </div>
  );
}
