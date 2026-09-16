import {
  APPLICATIONS,
  CLASSIFICATION_FILTER_NO_COMPANY,
  CLASSIFICATION_FILTER_UNKNOWN,
  INDUSTRIES,
  applicationFilterLabel,
  industryFilterLabel,
  sectorFilterLabel,
} from "@/lib/classification";
import {
  FILTER_COUNT_MODE,
  FILTER_EMPTY_BEHAVIOR,
  type FilterDefinition,
  type FilterEntityType,
} from "@/lib/filters/types";
import type { FacetCatalogItem } from "@/lib/filters/options";

const facet = (
  definition: Omit<FilterDefinition, "countMode" | "emptyBehavior"> &
    Partial<Pick<FilterDefinition, "countMode" | "emptyBehavior">>,
): FilterDefinition => ({
  countMode: FILTER_COUNT_MODE,
  emptyBehavior: FILTER_EMPTY_BEHAVIOR,
  ...definition,
});

export const LEAD_FILTER_DEFINITIONS = [
  facet({
    key: "zoeken",
    entityType: "lead",
    type: "search",
    optionSource: "derived",
    isFacet: false,
  }),
  facet({
    key: "fase",
    entityType: "lead",
    type: "single",
    optionSource: "database",
    isFacet: true,
  }),
  facet({
    key: "bron",
    entityType: "lead",
    type: "single",
    optionSource: "database",
    includeUnknownOption: true,
    isFacet: true,
  }),
  facet({
    key: "eigenaar",
    entityType: "lead",
    type: "single",
    optionSource: "database",
    includeUnknownOption: true,
    isFacet: true,
  }),
  facet({
    key: "status",
    entityType: "lead",
    type: "single",
    optionSource: "static",
    isFacet: true,
  }),
  facet({
    key: "leadscore",
    entityType: "lead",
    type: "single",
    optionSource: "derived",
    isFacet: true,
  }),
  facet({
    key: "branche",
    entityType: "lead",
    type: "multi",
    optionSource: "relation",
    selectionOperator: "OR",
    includeUnknownOption: true,
    isFacet: true,
  }),
  facet({
    key: "sector",
    entityType: "lead",
    type: "multi",
    optionSource: "relation",
    selectionOperator: "OR",
    includeUnknownOption: true,
    isFacet: true,
  }),
  facet({
    key: "toepassing",
    entityType: "lead",
    type: "multi",
    optionSource: "relation",
    selectionOperator: "OR",
    includeUnknownOption: true,
    isFacet: true,
  }),
  facet({
    key: "waarde",
    entityType: "lead",
    type: "range",
    optionSource: "derived",
    isFacet: false,
  }),
  facet({
    key: "datum",
    entityType: "lead",
    type: "date",
    optionSource: "derived",
    isFacet: false,
  }),
  facet({
    key: "sortering",
    entityType: "lead",
    type: "single",
    optionSource: "static",
    isFacet: false,
  }),
] as const satisfies readonly FilterDefinition[];

export const COMPANY_FILTER_DEFINITIONS = [
  facet({
    key: "zoeken",
    entityType: "company",
    type: "search",
    optionSource: "derived",
    isFacet: false,
  }),
  facet({
    key: "plaats",
    entityType: "company",
    type: "single",
    optionSource: "database",
    includeUnknownOption: true,
    isFacet: true,
  }),
  facet({
    key: "land",
    entityType: "company",
    type: "single",
    optionSource: "database",
    isFacet: true,
  }),
  facet({
    key: "eigenaar",
    entityType: "company",
    type: "single",
    optionSource: "database",
    includeUnknownOption: true,
    isFacet: true,
  }),
  facet({
    key: "leads",
    entityType: "company",
    type: "single",
    optionSource: "derived",
    isFacet: true,
  }),
  facet({
    key: "branche",
    entityType: "company",
    type: "multi",
    optionSource: "database",
    selectionOperator: "OR",
    includeUnknownOption: true,
    isFacet: true,
  }),
  facet({
    key: "sector",
    entityType: "company",
    type: "multi",
    optionSource: "database",
    selectionOperator: "OR",
    includeUnknownOption: true,
    isFacet: true,
  }),
  facet({
    key: "toepassing",
    entityType: "company",
    type: "multi",
    optionSource: "relation",
    selectionOperator: "OR",
    includeUnknownOption: true,
    isFacet: true,
  }),
] as const satisfies readonly FilterDefinition[];

export const CONTACT_FILTER_DEFINITIONS = [
  facet({
    key: "zoeken",
    entityType: "contact",
    type: "search",
    optionSource: "derived",
    isFacet: false,
  }),
  facet({
    key: "bedrijf",
    entityType: "contact",
    type: "single",
    optionSource: "database",
    includeUnknownOption: true,
    isFacet: true,
  }),
  facet({
    key: "eigenaar",
    entityType: "contact",
    type: "single",
    optionSource: "database",
    includeUnknownOption: true,
    isFacet: true,
  }),
  facet({
    key: "branche",
    entityType: "contact",
    type: "multi",
    optionSource: "relation",
    selectionOperator: "OR",
    includeUnknownOption: true,
    isFacet: true,
  }),
  facet({
    key: "sector",
    entityType: "contact",
    type: "multi",
    optionSource: "relation",
    selectionOperator: "OR",
    includeUnknownOption: true,
    isFacet: true,
  }),
  facet({
    key: "toepassing",
    entityType: "contact",
    type: "multi",
    optionSource: "relation",
    selectionOperator: "OR",
    includeUnknownOption: true,
    isFacet: true,
  }),
] as const satisfies readonly FilterDefinition[];

export const TASK_FILTER_DEFINITIONS = [
  facet({
    key: "zoeken",
    entityType: "task",
    type: "search",
    optionSource: "derived",
    isFacet: false,
  }),
  facet({
    key: "eigenaar",
    entityType: "task",
    type: "single",
    optionSource: "database",
    isFacet: true,
  }),
  facet({
    key: "wanneer",
    entityType: "task",
    type: "single",
    optionSource: "derived",
    isFacet: true,
  }),
  facet({
    key: "afgerond",
    entityType: "task",
    type: "single",
    optionSource: "static",
    isFacet: true,
  }),
  facet({
    key: "datum",
    entityType: "task",
    type: "date",
    optionSource: "derived",
    isFacet: false,
  }),
] as const satisfies readonly FilterDefinition[];

export const QUOTE_FILTER_DEFINITIONS = [
  facet({
    key: "zoeken",
    entityType: "quote",
    type: "search",
    optionSource: "derived",
    isFacet: false,
  }),
  facet({
    key: "status",
    entityType: "quote",
    type: "single",
    optionSource: "static",
    isFacet: true,
  }),
  facet({
    key: "klant",
    entityType: "quote",
    type: "single",
    optionSource: "database",
    isFacet: true,
  }),
  facet({
    key: "datum",
    entityType: "quote",
    type: "date",
    optionSource: "derived",
    isFacet: false,
  }),
] as const satisfies readonly FilterDefinition[];

export const ORDER_FILTER_DEFINITIONS = [
  facet({
    key: "zoeken",
    entityType: "order",
    type: "search",
    optionSource: "derived",
    isFacet: false,
  }),
  facet({
    key: "status",
    entityType: "order",
    type: "single",
    optionSource: "static",
    isFacet: true,
  }),
  facet({
    key: "klant",
    entityType: "order",
    type: "single",
    optionSource: "database",
    isFacet: true,
  }),
  facet({
    key: "datum",
    entityType: "order",
    type: "date",
    optionSource: "derived",
    isFacet: false,
  }),
] as const satisfies readonly FilterDefinition[];

const DEFINITIONS_BY_ENTITY: Record<FilterEntityType, readonly FilterDefinition[]> =
  {
    lead: LEAD_FILTER_DEFINITIONS,
    company: COMPANY_FILTER_DEFINITIONS,
    contact: CONTACT_FILTER_DEFINITIONS,
    task: TASK_FILTER_DEFINITIONS,
    quote: QUOTE_FILTER_DEFINITIONS,
    order: ORDER_FILTER_DEFINITIONS,
  };

export function filterDefinitionsFor(
  entityType: FilterEntityType,
): readonly FilterDefinition[] {
  return DEFINITIONS_BY_ENTITY[entityType];
}

export function isRegisteredFacetKey(
  entityType: FilterEntityType,
  key: string,
): boolean {
  return DEFINITIONS_BY_ENTITY[entityType].some(
    (definition) => definition.key === key,
  );
}

export function registeredFacetKeys(entityType: FilterEntityType): string[] {
  return DEFINITIONS_BY_ENTITY[entityType]
    .filter((definition) => definition.isFacet)
    .map((definition) => definition.key);
}

const SECTOR_CATALOG: FacetCatalogItem[] = (() => {
  const items: FacetCatalogItem[] = [
    {
      value: CLASSIFICATION_FILTER_UNKNOWN,
      label: sectorFilterLabel(CLASSIFICATION_FILTER_UNKNOWN),
    },
  ];
  const seen = new Set<string>();
  for (const industry of INDUSTRIES) {
    for (const sector of industry.sectors) {
      if (seen.has(sector.code)) continue;
      seen.add(sector.code);
      items.push({ value: sector.code, label: sector.label });
    }
  }
  return items;
})();

export function industryFacetCatalog(options?: {
  includeNoCompany?: boolean;
}): FacetCatalogItem[] {
  const items: FacetCatalogItem[] = [];
  if (options?.includeNoCompany) {
    items.push({
      value: CLASSIFICATION_FILTER_NO_COMPANY,
      label: industryFilterLabel(CLASSIFICATION_FILTER_NO_COMPANY),
    });
  }
  items.push({
    value: CLASSIFICATION_FILTER_UNKNOWN,
    label: industryFilterLabel(CLASSIFICATION_FILTER_UNKNOWN),
  });
  for (const industry of INDUSTRIES) {
    items.push({ value: industry.code, label: industry.label });
  }
  return items;
}

export function sectorFacetCatalog(): FacetCatalogItem[] {
  return SECTOR_CATALOG;
}

export function applicationFacetCatalog(): FacetCatalogItem[] {
  return [
    {
      value: CLASSIFICATION_FILTER_UNKNOWN,
      label: applicationFilterLabel(CLASSIFICATION_FILTER_UNKNOWN),
    },
    ...APPLICATIONS.map((item) => ({
      value: item.code,
      label: applicationFilterLabel(item.code),
    })),
  ];
}
