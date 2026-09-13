import {
  effectiveSearchQuery,
  firstSearchParam,
  parsePageParam,
  setIfPresent,
  toListHref,
} from "@/lib/list-query";

export type ContactOwnerFilter = "alle" | "niet-toegewezen" | "aan-mij" | string;

export type ContactOwnerFacets = {
  ownerTotal: number;
  unassignedOwner: number;
  assignedToMe: number;
  byOwner: Array<{ userId: string; count: number }>;
};

export type ContactsFilterValues = {
  zoeken: string;
  bedrijf: string;
  eigenaar: string;
};

export type ContactsQueryValues = ContactsFilterValues & {
  pagina?: number;
};

export function parseContactOwnerFilter(
  value: string | null | undefined,
): ContactOwnerFilter {
  return value?.trim() || "alle";
}

export function parseContactsSearchParams(
  params: Record<string, string | string[] | undefined>,
): ContactsFilterValues & { pagina: number } {
  return {
    zoeken: effectiveSearchQuery(firstSearchParam(params, "zoeken")),
    bedrijf: firstSearchParam(params, "bedrijf").trim(),
    eigenaar: parseContactOwnerFilter(firstSearchParam(params, "eigenaar")),
    pagina: parsePageParam(firstSearchParam(params, "pagina")),
  };
}

export function buildContactsHref(values: ContactsQueryValues): string {
  const query = new URLSearchParams();
  const eigenaar = parseContactOwnerFilter(values.eigenaar);
  setIfPresent(query, "zoeken", effectiveSearchQuery(values.zoeken));
  setIfPresent(query, "bedrijf", values.bedrijf);
  if (eigenaar !== "alle") query.set("eigenaar", eigenaar);
  const pagina = Math.max(values.pagina ?? 1, 1);
  if (pagina > 1) query.set("pagina", String(pagina));
  return toListHref("/contacten", query);
}
