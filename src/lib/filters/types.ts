export const FILTER_ENTITY_TYPES = [
  "lead",
  "company",
  "contact",
  "task",
  "quote",
  "order",
] as const;

export type FilterEntityType = (typeof FILTER_ENTITY_TYPES)[number];

export const FILTER_VALUE_TYPES = [
  "single",
  "multi",
  "search",
  "range",
  "date",
] as const;

export type FilterValueType = (typeof FILTER_VALUE_TYPES)[number];

export const FILTER_OPTION_SOURCES = [
  "static",
  "database",
  "relation",
  "derived",
] as const;

export type FilterOptionSource = (typeof FILTER_OPTION_SOURCES)[number];

/**
 * JetSmartFilters "Change Counters = Other Filters Changed":
 * counts for facet F ignore F's own selection.
 */
export const FILTER_COUNT_MODE = "OTHER_FILTERS_CHANGED" as const;
export type FilterCountMode = typeof FILTER_COUNT_MODE;

/** Empty options stay visible and cannot be newly selected. */
export const FILTER_EMPTY_BEHAVIOR = "DISABLE" as const;
export type FilterEmptyBehavior = typeof FILTER_EMPTY_BEHAVIOR;

export type FilterDefinition = {
  key: string;
  entityType: FilterEntityType;
  type: FilterValueType;
  optionSource: FilterOptionSource;
  /** Within one multi-select facet. Between facets is always AND. */
  selectionOperator?: "OR" | "AND";
  countMode: FilterCountMode;
  emptyBehavior: FilterEmptyBehavior;
  includeUnknownOption?: boolean;
  /** Sort, free range and search are not counted as discrete options. */
  isFacet: boolean;
};

export type FacetOption = {
  value: string;
  label: string;
  /** null = tellingen niet beschikbaar; nooit behandelen als 0. */
  count: number | null;
  disabled: boolean;
  image?: string | null;
};

export type FacetResult = {
  key: string;
  options: FacetOption[];
  total: number | null;
};

export type FilterIndexMeta = {
  version: number;
  generatedAt: string;
  mode: "live";
  stale: boolean;
};

export type IndexedListResult<T> = {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
  };
  total: number;
  facets: Record<string, FacetResult>;
  index: FilterIndexMeta;
};

export type FacetCountMap = Map<string, number>;
