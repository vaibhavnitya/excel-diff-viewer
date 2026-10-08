import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixturesRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  'fixtures',
);

/** Read a fixture file as `Uint8Array` (compatible with `ParseInput`). */
export function loadFixture(relativePath: string): Uint8Array {
  const abs = join(fixturesRoot, relativePath);
  return new Uint8Array(readFileSync(abs));
}

export function fixturePath(relativePath: string): string {
  return join(fixturesRoot, relativePath);
}
