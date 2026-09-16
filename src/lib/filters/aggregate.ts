import {
  CLASSIFICATION_FILTER_NO_COMPANY,
  CLASSIFICATION_FILTER_UNKNOWN,
} from "@/lib/classification";
import type { FacetCountMap } from "@/lib/filters/types";

export function rowsFromCountMap(
  map: FacetCountMap,
): Array<{ value: string; count: number }> {
  return [...map.entries()].map(([value, count]) => ({ value, count }));
}

export function sumGroupCounts(
  groups: Array<{ _count: { _all: number } }>,
): number {
  return groups.reduce((sum, group) => sum + group._count._all, 0);
}

export function mapGroupCounts<Key extends string>(
  groups: Array<Record<Key, string | null> & { _count: { _all: number } }>,
  key: Key,
  nullValue?: string,
): FacetCountMap {
  const map = new Map<string, number>();
  for (const group of groups) {
    const raw = group[key];
    if (raw == null) {
      if (nullValue) {
        map.set(nullValue, (map.get(nullValue) ?? 0) + group._count._all);
      }
      continue;
    }
    map.set(raw, (map.get(raw) ?? 0) + group._count._all);
  }
  return map;
}

export type OwnerFacetCounts = {
  ownerTotal: number;
  unassignedOwner: number;
  assignedToMe: number;
  byOwner: Array<{ userId: string; count: number }>;
};

export function ownerFacetsFromGroups(
  groups: Array<{ ownerUserId: string | null; _count: { _all: number } }>,
  currentUserId?: string,
): OwnerFacetCounts {
  const ownerTotal = sumGroupCounts(groups);
  const unassignedOwner =
    groups.find((group) => group.ownerUserId == null)?._count._all ?? 0;
  return {
    ownerTotal,
    unassignedOwner,
    assignedToMe: currentUserId
      ? (groups.find((group) => group.ownerUserId === currentUserId)?._count
          ._all ?? 0)
      : 0,
    byOwner: groups.flatMap((group) =>
      group.ownerUserId
        ? [{ userId: group.ownerUserId, count: group._count._all }]
        : [],
    ),
  };
}

export function ownerCountMap(
  facets: OwnerFacetCounts,
  currentUserId?: string,
): FacetCountMap {
  const map = new Map<string, number>();
  map.set("alle", facets.ownerTotal);
  map.set("niet-toegewezen", facets.unassignedOwner);
  map.set("aan-mij", facets.assignedToMe);
  for (const row of facets.byOwner) {
    map.set(row.userId, row.count);
  }
  if (currentUserId && !map.has(currentUserId)) {
    map.set(currentUserId, facets.assignedToMe);
  }
  return map;
}

export type LinkedCompany = {
  id: string;
  industryCode: string | null;
  sectorCode: string | null;
};

/**
 * COUNT(DISTINCT entity) via één companyId per rij: tel de groeptelling,
 * nooit het aantal company-rijen.
 */
export function aggregateLinkedCompanyFacets(
  groups: Array<{ companyId: string | null; count: number }>,
  companies: readonly LinkedCompany[],
  options?: { includeNoCompany?: boolean },
): {
  industry: FacetCountMap;
  sector: FacetCountMap;
  noCompany: number;
  unknownIndustry: number;
  unknownSector: number;
  total: number;
} {
  const byId = new Map(companies.map((company) => [company.id, company]));
  let noCompany = 0;
  let unknownIndustry = 0;
  let unknownSector = 0;
  let total = 0;
  const byIndustry = new Map<string, number>();
  const bySector = new Map<string, number>();

  for (const group of groups) {
    const count = group.count;
    total += count;
    if (!group.companyId) {
      noCompany += count;
      continue;
    }
    const company = byId.get(group.companyId);
    if (!company?.industryCode) {
      unknownIndustry += count;
      continue;
    }
    byIndustry.set(
      company.industryCode,
      (byIndustry.get(company.industryCode) ?? 0) + count,
    );
    if (!company.sectorCode) {
      unknownSector += count;
    } else {
      bySector.set(
        company.sectorCode,
        (bySector.get(company.sectorCode) ?? 0) + count,
      );
    }
  }

  const industry = new Map(byIndustry);
  industry.set(CLASSIFICATION_FILTER_UNKNOWN, unknownIndustry);
  if (options?.includeNoCompany) {
    industry.set(CLASSIFICATION_FILTER_NO_COMPANY, noCompany);
  }

  const sector = new Map(bySector);
  sector.set(CLASSIFICATION_FILTER_UNKNOWN, unknownSector);

  return {
    industry,
    sector,
    noCompany,
    unknownIndustry,
    unknownSector,
    total,
  };
}

/** Unieke parent-entiteiten per toepassing; voorkomt dubbele joins. */
export function distinctCodesByEntity(
  rows: Array<{ entityId: string | null; codes: readonly string[] }>,
): { byCode: FacetCountMap; unknown: number; total: number } {
  const byCodeEntities = new Map<string, Set<string>>();
  const withAny = new Set<string>();
  const all = new Set<string>();

  for (const row of rows) {
    const entityId = row.entityId?.trim();
    if (!entityId) continue;
    all.add(entityId);
    const uniqueCodes = new Set(row.codes.filter(Boolean));
    if (uniqueCodes.size === 0) continue;
    withAny.add(entityId);
    for (const code of uniqueCodes) {
      let set = byCodeEntities.get(code);
      if (!set) {
        set = new Set();
        byCodeEntities.set(code, set);
      }
      set.add(entityId);
    }
  }

  const byCode: FacetCountMap = new Map();
  for (const [code, entities] of byCodeEntities) {
    byCode.set(code, entities.size);
  }
  const unknown = Math.max(all.size - withAny.size, 0);
  byCode.set(CLASSIFICATION_FILTER_UNKNOWN, unknown);
  return { byCode, unknown, total: all.size };
}
