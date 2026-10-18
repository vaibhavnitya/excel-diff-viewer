import type { SummaryCache, SummaryConfig, Workbook, WorkbookSummary } from '../types.js';

/**
 * Internal shape — not exported.
 * WeakMap on Workbook allows GC when workbooks are dropped.
 * Inner Map on SummaryConfig is strong — configs are usually long-lived constants.
 * Keys on reference identity of both Workbook and SummaryConfig (not deep equality).
 */
type SummaryCacheStore = WeakMap<Workbook, Map<SummaryConfig, WorkbookSummary>>;

type SummaryCacheInternal = SummaryCache & {
  readonly __store: SummaryCacheStore;
};

/**
 * Create an opaque summary cache keyed on workbook + config reference identity.
 */
export function createSummaryCache(): SummaryCache {
  const store: SummaryCacheStore = new WeakMap();
  const cache: SummaryCacheInternal = {
    __brand: 'SummaryCache',
    __store: store,
  };
  return cache;
}

function getStore(cache: SummaryCache): SummaryCacheStore {
  return (cache as SummaryCacheInternal).__store;
}

export function cacheGet(
  cache: SummaryCache,
  workbook: Workbook,
  config: SummaryConfig,
): WorkbookSummary | undefined {
  const byConfig = getStore(cache).get(workbook);
  if (byConfig === undefined) {
    return undefined;
  }
  return byConfig.get(config);
}

export function cacheSet(
  cache: SummaryCache,
  workbook: Workbook,
  config: SummaryConfig,
  summary: WorkbookSummary,
): void {
  const store = getStore(cache);
  let byConfig = store.get(workbook);
  if (byConfig === undefined) {
    byConfig = new Map();
    store.set(workbook, byConfig);
  }
  byConfig.set(config, summary);
}
