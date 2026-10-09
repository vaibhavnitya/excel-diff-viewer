import type { ClassNameSlot } from '../types.js';
import { cx } from '../utils/cx.js';

const DEFAULTS: Record<ClassNameSlot, string> = {
  root: 'edv-root',
  toolbar: 'edv-toolbar',
  grid: 'edv-grid',
  sheetTabs: 'edv-sheet-tabs',
  error: 'edv-error',
  loading: 'edv-loading',
  addedCell: 'edv-added-cell',
  removedCell: 'edv-removed-cell',
  modifiedCell: 'edv-modified-cell',
  addedRow: 'edv-added-row',
  removedRow: 'edv-removed-row',
  modifiedRow: 'edv-modified-row',
  keyColumn: 'edv-key-column',
};

export function slotClass(
  slot: ClassNameSlot,
  classNames?: Partial<Record<ClassNameSlot, string>>,
): string {
  return cx(DEFAULTS[slot], classNames?.[slot]);
}
