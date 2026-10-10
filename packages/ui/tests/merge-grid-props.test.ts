import { afterEach, describe, expect, it, vi } from 'vitest';
import { mergeGridProps } from '../src/merge-grid-props.js';

describe('mergeGridProps', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lets the user win for sideBar', () => {
    const merged = mergeGridProps(
      { sideBar: false, animateRows: false },
      { rowData: [{ id: 1 }] },
      { sideBar: true },
    );
    expect(merged.sideBar).toBe(true);
    expect(merged.animateRows).toBe(false);
  });

  it('keeps library-locked rowData over the user value', () => {
    const libraryRows = [{ id: 'lib' }];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const merged = mergeGridProps(
      { animateRows: false },
      { rowData: libraryRows },
      { rowData: [{ id: 'user' }] },
    );
    expect(merged.rowData).toBe(libraryRows);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('agGridProps.rowData is locked'),
    );
  });

  it('deep-merges defaultColDef with user keys winning on conflict', () => {
    const merged = mergeGridProps(
      {
        defaultColDef: {
          sortable: true,
          filter: true,
          floatingFilter: false,
          minWidth: 100,
        },
      },
      {},
      {
        defaultColDef: {
          floatingFilter: true,
          minWidth: 160,
        },
      },
    );
    expect(merged.defaultColDef).toEqual({
      sortable: true,
      filter: true,
      floatingFilter: true,
      minWidth: 160,
    });
  });
});
