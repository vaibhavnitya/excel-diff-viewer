import type { DiffPhase, OverlayPhase } from '@mojro/excel-diff-react';

const LABELS: Record<DiffPhase | OverlayPhase, string> = {
  'parsing-a': 'Parsing file A',
  'parsing-b': 'Parsing file B',
  diffing: 'Diffing',
  'parsing-base': 'Parsing base',
  'parsing-overlay': 'Parsing overlay',
  overlaying: 'Overlaying',
  composing: 'Composing',
};

export function phaseLabel(phase?: string): string | undefined {
  if (phase === undefined) {
    return undefined;
  }
  if (phase in LABELS) {
    return LABELS[phase as DiffPhase | OverlayPhase];
  }
  return phase;
}
