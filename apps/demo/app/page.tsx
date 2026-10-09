import Link from 'next/link';
import { Columns2, FileSpreadsheet, GitCompare } from 'lucide-react';

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
            npm install @your-scope/excel-diff-ui
          </code>
        </div>
      </footer>
    </div>
  );
}
