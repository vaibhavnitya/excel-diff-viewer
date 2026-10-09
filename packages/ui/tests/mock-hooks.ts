import { vi } from 'vitest';

vi.mock('@mojro/excel-diff-react', () => ({
  useExcelFile: vi.fn(() => ({ status: 'idle' as const })),
  useExcelDiff: vi.fn(() => ({ status: 'idle' as const })),
}));
