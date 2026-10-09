'use client';
import { useState } from 'react';
import { ExcelSplitViewer } from '@your-scope/excel-diff-ui';
import type { DiffSchema } from '@your-scope/excel-diff-ui';
import '@your-scope/excel-diff-ui/styles.css';

export default function SplitSmoke() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const schema: DiffSchema = {
    keyFields: ['Business Requirement'],
    valueFields: ['Business Requirement'],
    optionalKeyFields: ['Business Requirement'],
  };
  return (
    <div style={{ padding: 20 }}>
      <h1>Split smoke</h1>
      <div style={{ display: 'flex', gap: 20 }}>
        <label>
          File A:{' '}
          <input
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => setFileA(e.target.files?.[0] ?? null)}
          />
        </label>
        <label>
          File B:{' '}
          <input
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => setFileB(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      <div style={{ marginTop: 20, height: 500, border: '1px solid #ccc' }}>
        <ExcelSplitViewer fileA={fileA} fileB={fileB} schema={schema} />
      </div>
    </div>
  );
}
