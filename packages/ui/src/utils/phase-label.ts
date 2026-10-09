import type { DiffPhase } from '@mojro/excel-diff-react';

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
