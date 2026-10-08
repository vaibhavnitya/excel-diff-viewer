import { PACKAGE_NAME as corePackageName } from '@your-scope/excel-diff-core';
import { PACKAGE_NAME as reactPackageName } from '@your-scope/excel-diff-react';

export const PACKAGE_NAME = '@your-scope/excel-diff-ag-grid' as const;

/** Scaffold marker. Viewer components arrive in a later phase. */
export const SCAFFOLD_DEPENDENCIES: readonly string[] = [
  corePackageName,
  reactPackageName,
];
