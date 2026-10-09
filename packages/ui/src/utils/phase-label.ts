import type { DiffPhase } from '@your-scope/excel-diff-react';

const LABELS: Record<DiffPhase, string> = {
  'parsing-a': 'Parsing file A',
  'parsing-b': 'Parsing file B',
  diffing: 'Diffing',
};

export function phaseLabel(phase?: string): string | undefined {
  if (phase === undefined) {
    return undefined;
  }
  if (phase in LABELS) {
    return LABELS[phase as DiffPhase];
  }
  return phase;
}
