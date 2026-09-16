import { formatCount } from "@/lib/format";
import type { FacetCountMap, FacetOption } from "@/lib/filters/types";

export type FacetCatalogItem = {
  value: string;
  label: string;
  image?: string | null;
};

/**
 * LEFT JOIN: iedere catalogusoptie krijgt een telling.
 * Ontbrekende keys in `counts` zijn 0. `counts === null` betekent stale/fout;
 * dan geen 0 invullen en niets disablen.
 */
export function mergeFacetOptions(args: {
  catalog: readonly FacetCatalogItem[];
  counts: FacetCountMap | null;
  selected?: Iterable<string>;
}): FacetOption[] {
  const selected = new Set(
    Array.from(args.selected ?? []).filter((value) => value.trim() !== ""),
  );
  const seen = new Set<string>();
  const options: FacetOption[] = [];

  for (const item of args.catalog) {
    if (seen.has(item.value)) continue;
    seen.add(item.value);
    options.push(toFacetOption(item, args.counts, selected.has(item.value)));
  }

  for (const value of selected) {
    if (seen.has(value)) continue;
    seen.add(value);
    options.push(
      toFacetOption({ value, label: value }, args.counts, true),
    );
  }

  return options;
}

function toFacetOption(
  item: FacetCatalogItem,
  counts: FacetCountMap | null,
  selected: boolean,
): FacetOption {
  const count = counts == null ? null : (counts.get(item.value) ?? 0);
  return {
    value: item.value,
    label: item.label,
    count,
    disabled: count === 0 && !selected,
    image: item.image,
  };
}

export function facetHint(count: number | null | undefined): string | undefined {
  if (count == null) return undefined;
  return formatCount(count);
}

export function facetOptionDisabled(
  count: number | null | undefined,
  selected: boolean,
): boolean {
  return count === 0 && !selected;
}

export function toCountMap(
  rows: Iterable<{ value: string; count: number }>,
): FacetCountMap {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.value, (map.get(row.value) ?? 0) + row.count);
  }
  return map;
}

export function countsFromRecord(
  record: Record<string, number | undefined> | null | undefined,
): FacetCountMap {
  const map = new Map<string, number>();
  if (!record) return map;
  for (const [value, count] of Object.entries(record)) {
    if (typeof count === "number") map.set(value, count);
  }
  return map;
}
