# Development Guide

## Prerequisites

- Node.js >= 20
- npm >= 10 (comes with Node 20)

## Setup

```bash
git clone <repo>
cd excel-diff-viewer
npm install
```

npm will set up all workspaces automatically.

## Daily workflow

Start everything (demo + library watchers):
```bash
npm run dev
```
Demo runs at http://localhost:3000. Library edits hot-reload in the demo.

Run tests in watch mode (one package):
```bash
npm run test:watch --workspace=@your-scope/excel-diff-core
```

Run all tests once:
```bash
npm test
```

Typecheck + lint before pushing:
```bash
npm run typecheck && npm run lint
```

## Repo layout

```
packages/
  core/        Parsing + diff engine
  react/       React hooks
  ui/          Drop-in components (AG Grid)
apps/
  demo/        Next.js demo (deployed to Vercel)
e2e/           Playwright tests against demo
fixtures/      Shared xlsx/csv test files
```

## What ships to npm

Only `packages/*/dist/` plus README and LICENSE. Controlled by `"files"`
in each package's `package.json`. Verify with:
```bash
cd packages/core && npm pack --dry-run
```

Demo app has `"private": true` — can never be published.

## Testing layers

1. **Unit** (Vitest) — per-package, fast, no browser.
2. **Component** (Vitest browser mode) — Worker, virtualization, real DOM.
3. **E2E** (Playwright) — against the demo app, catches bundler issues.

Fixtures live in `/fixtures/` at the repo root and are shared across all
layers and the demo.

## npm workspaces notes

- Internal deps use `"*"` as the version (e.g. `"@your-scope/excel-diff-core": "*"`).
  npm resolves this to the local workspace package.
- Run commands against specific workspaces with `--workspace=<name>` or `-w <name>`.
- `npm install <pkg> -w <workspace-name>` installs to a specific workspace.

## Adding a changeset (for releases)

When you make a user-facing change:
```bash
npm run changeset
```
Pick packages, pick bump type (patch/minor/major), describe the change.
Commit the generated file in `.changeset/`.

## Publishing (later)

```bash
npm run version   # bumps versions, updates changelogs
git commit -am "Version packages"
npm run release   # builds library only, publishes to npm
```

## Troubleshooting

- **Worker not loading in Next.js**: check `next.config.js` has the right
  setup for `new Worker(new URL(...))`. Test against the demo app first.
- **AG Grid CSS not applying**: must be imported in a Client Component
  (`'use client'`) in App Router.
- **Workspace changes not reflecting**: `npm install` after moving files.
- **"workspace protocol not supported"**: you may be reading pnpm docs; use
  `"*"` not `"workspace:*"` for internal deps.
