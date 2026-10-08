import {
  PACKAGE_NAME as agGridPackageName,
  SCAFFOLD_DEPENDENCIES as agGridDependencies,
} from '@your-scope/excel-diff-ag-grid';
import {
  PACKAGE_NAME as reactPackageName,
  SCAFFOLD_DEPENDENCIES as reactDependencies,
} from '@your-scope/excel-diff-react';

const layers = [
  {
    name: '@your-scope/excel-diff-core' as const,
    dependsOn: [] as const,
  },
  { name: reactPackageName, dependsOn: reactDependencies },
  { name: agGridPackageName, dependsOn: agGridDependencies },
] as const;

export default function HomePage() {
  return (
    <main>
      <p className="eyebrow">Phase 0</p>
      <h1>Excel Diff Viewer</h1>
      <p className="lede">
        The monorepo scaffold is wired. Parsing, diffing, hooks, and the grid
        arrive in later phases.
      </p>
      <ol>
        {layers.map((layer) => (
          <li key={layer.name}>
            <code>{layer.name}</code>
            <span>
              {layer.dependsOn.length === 0
                ? 'depends on nothing in this repo'
                : `depends on ${layer.dependsOn.join(', ')}`}
            </span>
          </li>
        ))}
      </ol>
    </main>
  );
}
