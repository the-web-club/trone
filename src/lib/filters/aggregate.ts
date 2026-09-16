import type { FacetCountMap } from "@/lib/filters/types";

export function rowsFromCountMap(
  map: FacetCountMap,
): Array<{ value: string; count: number }> {
  return [...map.entries()].map(([value, count]) => ({ value, count }));
}

function sumGroupCounts(groups: Array<{ _count: { _all: number } }>): number {
  return groups.reduce((sum, group) => sum + group._count._all, 0);
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
