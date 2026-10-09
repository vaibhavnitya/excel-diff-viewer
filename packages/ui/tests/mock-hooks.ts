import { vi } from 'vitest';

vi.mock('@your-scope/excel-diff-react', () => ({
  useExcelFile: vi.fn(() => ({ status: 'idle' as const })),
  useExcelDiff: vi.fn(() => ({ status: 'idle' as const })),
}));
