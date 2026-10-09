import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

let registered = false;

/** Idempotent AG Grid community module registration. */
export function ensureAgGridModules(): void {
  if (registered) {
    return;
  }
  ModuleRegistry.registerModules([AllCommunityModule]);
  registered = true;
}
