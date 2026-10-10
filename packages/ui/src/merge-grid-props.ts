import type { AgGridReactProps } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';

function isDev(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function warnLockedOverrides<TData>(
  libraryLocked: Partial<AgGridReactProps<TData>>,
  userProps: Partial<AgGridReactProps<TData>>,
): void {
  if (!isDev()) {
    return;
  }
  for (const key of Object.keys(libraryLocked) as Array<keyof AgGridReactProps<TData>>) {
    if (
      Object.prototype.hasOwnProperty.call(userProps, key) &&
      userProps[key] !== undefined
    ) {
      console.warn(
        `[excel-diff-ui] agGridProps.${String(key)} is locked by the library and will be ignored.`,
      );
    }
  }
}

/**
 * Merge AG Grid props: library defaults → user props → library locked.
 * `defaultColDef` is deep-merged (user keys win on conflict).
 */
export function mergeGridProps<TData>(
  libraryDefaults: AgGridReactProps<TData>,
  libraryLocked: Partial<AgGridReactProps<TData>>,
  userProps: Partial<AgGridReactProps<TData>> | undefined,
): AgGridReactProps<TData> {
  const user = userProps ?? {};
  warnLockedOverrides(libraryLocked, user);

  const mergedDefaultColDef: ColDef<TData> = {
    ...(libraryDefaults.defaultColDef ?? {}),
    ...(user.defaultColDef ?? {}),
  };

  const {
    defaultColDef: _libraryDefaultColDef,
    ...libraryRest
  } = libraryDefaults;
  const { defaultColDef: _userDefaultColDef, ...userRest } = user;

  return {
    ...libraryRest,
    ...userRest,
    defaultColDef: mergedDefaultColDef,
    ...libraryLocked,
  };
}
