import Link from 'next/link';

export function StylingBreadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link
            href="/docs/styling"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Styling
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className="font-medium text-foreground">{current}</li>
      </ol>
    </nav>
  );
}
