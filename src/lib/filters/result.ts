import type {
  FilterIndexMeta,
  IndexedListResult,
} from "@/lib/filters/types";

export const LIVE_FILTER_INDEX_VERSION = 1;

export function liveFilterIndexMeta(
  generatedAt = new Date(),
  stale = false,
): FilterIndexMeta {
  return {
    version: LIVE_FILTER_INDEX_VERSION,
    generatedAt: generatedAt.toISOString(),
    mode: "live",
    stale,
  };
}

export function indexedListResult<T>(args: {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  facets: IndexedListResult<T>["facets"];
  index?: FilterIndexMeta;
}): IndexedListResult<T> {
  const pageSize = Math.max(args.pageSize, 1);
  return {
    items: args.items,
    total: args.total,
    pagination: {
      page: args.page,
      pageSize,
      totalPages: Math.max(Math.ceil(args.total / pageSize), 1),
    },
    facets: args.facets,
    index: args.index ?? liveFilterIndexMeta(),
  };
}
