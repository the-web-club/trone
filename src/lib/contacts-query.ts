import {
  effectiveSearchQuery,
  firstSearchParam,
  parsePageParam,
  setIfPresent,
  toListHref,
} from "@/lib/list-query";

export type ContactsFilterValues = {
  zoeken: string;
  bedrijf: string;
};

export type ContactsQueryValues = ContactsFilterValues & {
  pagina?: number;
};

export function parseContactsSearchParams(
  params: Record<string, string | string[] | undefined>,
): ContactsFilterValues & { pagina: number } {
  return {
    zoeken: effectiveSearchQuery(firstSearchParam(params, "zoeken")),
    bedrijf: firstSearchParam(params, "bedrijf").trim(),
    pagina: parsePageParam(firstSearchParam(params, "pagina")),
  };
}

export function buildContactsHref(values: ContactsQueryValues): string {
  const query = new URLSearchParams();
  setIfPresent(query, "zoeken", effectiveSearchQuery(values.zoeken));
  setIfPresent(query, "bedrijf", values.bedrijf);
  const pagina = Math.max(values.pagina ?? 1, 1);
  if (pagina > 1) query.set("pagina", String(pagina));
  return toListHref("/contacten", query);
}
