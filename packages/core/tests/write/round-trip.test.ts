import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseFile } from '../../src/parsers/parse-file.js';
import type { CellValue, Sheet, Workbook } from '../../src/types.js';
import { writeWorkbook } from '../../src/write/write.js';
import { loadFixture } from '../fixtures/load-fixture.js';
import { workbooksStructurallyEqual } from './structural-equal.js';

const fixturesRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  'fixtures',
);

function makeWorkbook(
  sheets: readonly Sheet[],
  filename = 'generated.xlsx',
): Workbook {
  return {
    sheets,
    activeSheetIndex: 0,
    meta: { format: 'xlsx', filename },
  };
}

/** Hand-rolled varied workbooks covering the round-trip matrix (§1.5). */
function handRolledWorkbooks(): Workbook[] {
  const cases: Workbook[] = [];

  // 1. Single-row minimal
  cases.push(
    makeWorkbook([
      { name: 'Sheet1', headers: ['id'], rows: [[1]] },
    ]),
  );

  // 2. Every cell type
  cases.push(
    makeWorkbook([
      {
        name: 'Types',
        headers: ['s', 'n', 'b', 'nil', 'blank', 'd', 'dt'],
        rows: [
          [
            'text',
            -0.5,
            false,
            null,
            '',
            '2020-12-31',
            '2020-12-31T23:59:59.000Z',
          ],
        ],
      },
    ]),
  );

  // 3. Special characters in headers
  cases.push(
    makeWorkbook([
      {
        name: 'Hdr',
        headers: ['a"b', 'c,d', 'e\nf', '한글', 'Emoji🎉'],
        rows: [['1', '2', '3', '4', '5']],
      },
    ]),
  );

  // 4. Multi-sheet
  cases.push(
    makeWorkbook([
      { name: 'A', headers: ['x'], rows: [['a']] },
      { name: 'B', headers: ['y', 'z'], rows: [[1, 2], [3, 4]] },
      { name: 'C', headers: ['only'], rows: [] },
    ]),
  );

  // 5. Blank vs null distinction (mixed with non-empty cells so the parser
  // does not drop the row — it skips rows where every cell is null or '').
  cases.push(
    makeWorkbook([
      {
        name: 'BlankNull',
        headers: ['a', 'b', 'c'],
        rows: [
          ['', null, 'x'],
          [null, '', 'y'],
          ['keep', 'both', ''],
        ],
      },
    ]),
  );

  // 6–10. Varied row counts / narrow-wide
  for (const n of [0, 1, 2, 10, 50]) {
    cases.push(
      makeWorkbook([
        {
          name: `Rows${n}`,
          headers: ['i', 'label'],
          rows: Array.from({ length: n }, (_, i) => [i, `row-${i}`]),
        },
      ]),
    );
  }

  // 11. Boolean mix
  cases.push(
    makeWorkbook([
      {
        name: 'Bools',
        headers: ['flag'],
        rows: [[true], [false], [true]],
      },
    ]),
  );

  // 12. Large-ish numbers / scientific-ish strings that stay strings
  cases.push(
    makeWorkbook([
      {
        name: 'Nums',
        headers: ['n', 's'],
        rows: [[1e6, '1e6'], [0, '0'], [-42, '-42']],
      },
    ]),
  );

  // 13. Quotes / newlines in cells
  cases.push(
    makeWorkbook([
      {
        name: 'Text',
        headers: ['body'],
        rows: [['line1\nline2'], ['say "hello"'], ["it's fine"]],
      },
    ]),
  );

  // 14. Date-only column
  cases.push(
    makeWorkbook([
      {
        name: 'Dates',
        headers: ['d'],
        rows: [['1999-01-01'], ['2099-12-31']],
      },
    ]),
  );

  // 15. Datetime column
  cases.push(
    makeWorkbook([
      {
        name: 'DateTimes',
        headers: ['dt'],
        rows: [
          ['2024-01-15T10:30:00.000Z'],
          ['2024-06-01T00:00:00.000Z'],
        ],
      },
    ]),
  );

  // 16. Wide sheet
  {
    const headers = Array.from({ length: 30 }, (_, i) => `c${i}`);
    const row: CellValue[] = headers.map((_, i) => (i % 3 === 0 ? null : i));
    cases.push(
      makeWorkbook([{ name: 'Wide', headers, rows: [row, row] }]),
    );
  }

  // 17. Unicode sheet name (SheetJS allows most BMP)
  cases.push(
    makeWorkbook([
      { name: 'Rates', headers: ['€', '£'], rows: [[1.5, 2.5]] },
    ]),
  );

  // 18. Mixed null trailing
  cases.push(
    makeWorkbook([
      {
        name: 'Trail',
        headers: ['a', 'b', 'c'],
        rows: [['x', null, null], [null, null, 'y']],
      },
    ]),
  );

  // 19. Repeated identical rows
  cases.push(
    makeWorkbook([
      {
        name: 'Dup',
        headers: ['k', 'v'],
        rows: [
          ['a', 1],
          ['a', 1],
          ['b', 2],
        ],
      },
    ]),
  );

  // 20. Empty string header-adjacent values
  cases.push(
    makeWorkbook([
      {
        name: 'Edges',
        headers: ['leading', 'mid', 'trailing'],
        rows: [['', 'm', ''], ['x', '', 'z']],
      },
    ]),
  );

  return cases;
}

async function assertRoundTrip(original: Workbook, label: string): Promise<void> {
  const written = writeWorkbook(original);
  expect(written.ok, `${label}: write failed`).toBe(true);
  if (!written.ok) return;
  const parsed = await parseFile(written.value, {
    filename: original.meta.filename ?? 'round-trip.xlsx',
  });
  expect(parsed.ok, `${label}: re-parse failed`).toBe(true);
  if (!parsed.ok) return;
  expect(
    workbooksStructurallyEqual(original, parsed.value),
    `${label}: structural mismatch`,
  ).toBe(true);
}

function listXlsxFixtures(dir = '', prefix = ''): string[] {
  const abs = dir === '' ? fixturesRoot : join(fixturesRoot, dir);
  const entries = readdirSync(abs, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...listXlsxFixtures(rel, rel));
    } else if (entry.name.endsWith('.xlsx')) {
      out.push(rel);
    }
  }
  return out;
}

describe('writeWorkbook round-trip', () => {
  it.each(
    handRolledWorkbooks().map((w, i) => ({
      i,
      name: w.sheets.map((s) => s.name).join('+') || 'empty',
      workbook: w,
    })),
  )('hand-rolled #$i ($name)', async ({ workbook, name }) => {
    await assertRoundTrip(workbook, `hand-rolled:${name}`);
  });

  it.each(listXlsxFixtures(''))('fixture %s', async (rel) => {
    const bytes = loadFixture(rel);
    const parsed = await parseFile(bytes, { filename: rel });
    expect(parsed.ok, `parse fixture ${rel}`).toBe(true);
    if (!parsed.ok) return;
    // Skip workbooks that parsed to zero sheets (should not happen).
    if (parsed.value.sheets.length === 0) return;
    await assertRoundTrip(parsed.value, `fixture:${rel}`);
  });
});
