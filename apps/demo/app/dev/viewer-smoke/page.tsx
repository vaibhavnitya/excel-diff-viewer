'use client';
import { useState } from 'react';
import { ExcelViewer } from '@your-scope/excel-diff-ui';
import { useExcelFile } from '@your-scope/excel-diff-react';
import '@your-scope/excel-diff-ui/styles.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { AgGridReact } from 'ag-grid-react';

export default function ViewerSmoke() {
  const [file, setFile] = useState<File | null>(null);
  const state = useExcelFile(file);
  console.log('useExcelFile state:', state);
  
  return (
    <div style={{ padding: 20 }}>
      <input type="file" accept=".xlsx,.csv"
        onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <div style={{ marginTop: 20, height: 500, border: '1px solid #ccc' }}>
        <ExcelViewer file={file} height={600}/>
      </div>
    </div>
  );
}