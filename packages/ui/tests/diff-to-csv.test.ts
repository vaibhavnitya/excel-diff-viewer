import { describe, expect, it } from 'vitest';
import { diffToCSV } from '../src/csv/diff-to-csv.js';
import { diffResult, schema } from './fixtures.js';

describe('diffToCSV', () => {
  it('produces status, keys, and old/new value columns', () => {
    const csv = diffToCSV(diffResult(), schema);
    const lines = csv.trimEnd().split('\n');
    expect(lines[0]).toBe(
      'status,origin,destination,base_rate_old,base_rate_new,min_charge_old,min_charge_new',
    );
    expect(lines).toContain('unchanged,US,CA,10,10,5,5');
    expect(lines).toContain('modified,US,MX,12,15,6,6');
    expect(lines).toContain('added,US,BR,,20,,8');
    expect(lines).toContain('removed,US,PE,9,,4,');
  });

  it('escapes commas and quotes', () => {
    const result = diffResult();
    const row = result.rows[0];
    if (row === undefined || row.rowA === undefined || row.rowB === undefined) {
      throw new Error('fixture missing row');
    }
    const weird = {
      ...result,
      rows: [
        {
          ...row,
          rowA: ['US, East', 'CA', 10, 5] as const,
          rowB: ['US, East', 'CA', 10, 5] as const,
        },
      ],
    };
    const csv = diffToCSV(weird, schema);
    expect(csv).toContain('"US, East"');
  });
});
