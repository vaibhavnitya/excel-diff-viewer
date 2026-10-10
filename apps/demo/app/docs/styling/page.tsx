import { ThemeSwitcherDemo } from '@/components/docs/theme-switcher-demo';
import { CSS_VARIABLES } from '@/lib/docs-props';

export default function StylingDocsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="scroll-mt-24 text-3xl font-semibold tracking-tight">
          Styling
        </h1>
        <p className="leading-relaxed text-muted-foreground">
          The UI package ships static CSS. Theme with{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            --edv-*
          </code>{' '}
          CSS variables, the typed{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            theme
          </code>{' '}
          prop, or override slots via{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            classNames
          </code>
          . No CSS-in-JS runtime and no bundled design systems.
        </p>
      </header>

      <section className="space-y-3">
        <h2
          id="css-variables"
          className="scroll-mt-24 border-b pb-2 text-2xl font-semibold tracking-tight"
        >
          CSS variables
        </h2>
        <p className="text-muted-foreground">
          Defaults from{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            @mojro/excel-diff-ui/styles.css
          </code>
          . Dark values apply under{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            :root[data-theme=&apos;dark&apos;]
          </code>
          .
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Variable</th>
                <th className="px-3 py-2 text-left font-medium">Light</th>
                <th className="px-3 py-2 text-left font-medium">Dark</th>
                <th className="px-3 py-2 text-left font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {CSS_VARIABLES.map((row) => (
                <tr key={row.name} className="border-b align-top">
                  <td className="px-3 py-2 font-mono text-xs text-foreground">
                    {row.name}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {row.light}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {row.dark}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2
          id="theme-switcher"
          className="scroll-mt-24 border-b pb-2 text-2xl font-semibold tracking-tight"
        >
          Interactive theme switcher
        </h2>
        <p className="text-muted-foreground">
          Pick a preset. The viewer and the CSS override block update together.
        </p>
        <ThemeSwitcherDemo />
      </section>

      <section className="space-y-3">
        <h2
          id="theme-prop"
          className="scroll-mt-24 border-b pb-2 text-2xl font-semibold tracking-tight"
        >
          theme prop
        </h2>
        <p className="text-muted-foreground">
          Pass a typed{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            Theme
          </code>{' '}
          object to set{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            --edv-*
          </code>{' '}
          variables as inline styles on the component root. Every field is
          optional — omit what you do not want to override. The library does
          not import design systems; map MUI / Carbon / etc. tokens in your
          app (copy-paste adapters will land in a later demo phase).
        </p>
        <pre className="overflow-x-auto rounded-lg border bg-muted/60 p-4 text-sm leading-relaxed">
          <code>{`import { ExcelViewer, type Theme } from '@mojro/excel-diff-ui';

const theme: Theme = {
  colors: {
    added: '#dcfce7',
    modified: '#fef3c7',
    removed: '#fee2e2',
    headerBg: '#f5f5f5',
  },
  typography: { fontSize: 14, headerWeight: 600 },
  spacing: { rowHeight: 36, headerHeight: 40 },
  shape: { borderRadius: 4 },
};

<ExcelViewer file={file} height={600} theme={theme} />`}</code>
        </pre>
        <p className="text-sm text-muted-foreground">
          Precedence (low → high): stylesheet defaults → dark mode → consumer
          CSS →{' '}
          <code className="font-mono text-xs">theme</code> →{' '}
          <code className="font-mono text-xs">classNames</code> →{' '}
          <code className="font-mono text-xs">style</code>.{' '}
          <code className="font-mono text-xs">spacing.rowHeight</code> /{' '}
          <code className="font-mono text-xs">headerHeight</code> also feed AG
          Grid; explicit{' '}
          <code className="font-mono text-xs">agGridProps.rowHeight</code> still
          wins.
        </p>
      </section>

      <section className="space-y-3">
        <h2
          id="classnames"
          className="scroll-mt-24 border-b pb-2 text-2xl font-semibold tracking-tight"
        >
          classNames prop
        </h2>
        <p className="text-muted-foreground">
          Override named slots without fighting the default stylesheet:
        </p>
        <pre className="overflow-x-auto rounded-lg border bg-muted/60 p-4 text-sm leading-relaxed">
          <code>{`<ExcelViewer
  file={file}
  height={600}
  classNames={{
    root: 'my-viewer',
    toolbar: 'my-toolbar',
    addedCell: 'bg-emerald-100',
    removedCell: 'bg-rose-100',
    modifiedCell: 'bg-amber-100',
  }}
/>`}</code>
        </pre>
        <p className="text-sm text-muted-foreground">
          Slots: <code className="font-mono text-xs">root</code>,{' '}
          <code className="font-mono text-xs">toolbar</code>,{' '}
          <code className="font-mono text-xs">grid</code>,{' '}
          <code className="font-mono text-xs">sheetTabs</code>,{' '}
          <code className="font-mono text-xs">error</code>,{' '}
          <code className="font-mono text-xs">loading</code>,{' '}
          <code className="font-mono text-xs">addedCell</code>,{' '}
          <code className="font-mono text-xs">removedCell</code>,{' '}
          <code className="font-mono text-xs">modifiedCell</code>,{' '}
          <code className="font-mono text-xs">addedRow</code>,{' '}
          <code className="font-mono text-xs">removedRow</code>,{' '}
          <code className="font-mono text-xs">modifiedRow</code>,{' '}
          <code className="font-mono text-xs">keyColumn</code>.
        </p>
      </section>

      <section className="space-y-3">
        <h2
          id="dark-mode"
          className="scroll-mt-24 border-b pb-2 text-2xl font-semibold tracking-tight"
        >
          Dark mode
        </h2>
        <p className="text-muted-foreground">
          Built-in dark tokens activate when{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            data-theme=&quot;dark&quot;
          </code>{' '}
          is set on{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            :root
          </code>
          . This demo also toggles the{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            .dark
          </code>{' '}
          class via{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            next-themes
          </code>{' '}
          and syncs{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
            data-theme
          </code>{' '}
          for the UI package.
        </p>
      </section>
    </div>
  );
}
