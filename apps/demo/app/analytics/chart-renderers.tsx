'use client';

import type { SummaryRenderers } from '@mojro/excel-diff-ui';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

/** Demo-only Recharts escape hatch. Not a library dependency — copy freely. */
export const rechartsRenderers: SummaryRenderers = {
  numeric: (col) => (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart
        data={[
          { name: 'min', v: col.min ?? 0 },
          { name: 'mean', v: col.mean ?? 0 },
          { name: 'max', v: col.max ?? 0 },
        ]}
      >
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis hide />
        <Bar dataKey="v" fill="var(--edv-summary-bar-fill, #3b82f6)" />
      </BarChart>
    </ResponsiveContainer>
  ),

  categorical: (col) => (
    <ResponsiveContainer width="100%" height={Math.max(60, col.topValues.length * 22)}>
      <BarChart data={[...col.topValues]} layout="vertical" margin={{ left: 40 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="value" width={40} tick={{ fontSize: 10 }} />
        <Bar dataKey="count" fill="var(--edv-summary-bar-fill, #3b82f6)" />
      </BarChart>
    </ResponsiveContainer>
  ),

  date: (col) => (
    <p style={{ margin: 0, fontSize: '0.9em' }}>
      {col.min ?? '—'} → {col.max ?? '—'}
    </p>
  ),

  boolean: (col) => (
    <ResponsiveContainer width="100%" height={80}>
      <PieChart>
        <Pie
          data={[
            { name: 'true', value: col.trueCount },
            { name: 'false', value: col.falseCount },
          ]}
          dataKey="value"
          outerRadius={32}
          innerRadius={16}
        >
          <Cell fill="var(--edv-summary-bool-true, #16a34a)" />
          <Cell fill="var(--edv-summary-bool-false, #dc2626)" />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  ),
};
