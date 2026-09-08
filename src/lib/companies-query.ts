import {
  firstSearchParam,
  parsePageParam,
  setIfPresent,
  toListHref,
} from "@/lib/list-query";

export type CompanyOwnerFilter = "alle" | "niet-toegewezen" | "aan-mij" | string;

export type CompanyOwnerFacets = {
  ownerTotal: number;
  unassignedOwner: number;
  assignedToMe: number;
  byOwner: Array<{ userId: string; count: number }>;
};

export type CompaniesFilterValues = {
  zoeken: string;
  plaats: string;
  land: string;
  eigenaar: string;
};

export type CompaniesQueryValues = CompaniesFilterValues & {
  pagina?: number;
};

export function parseCompanyOwnerFilter(
  value: string | null | undefined,
): CompanyOwnerFilter {
  return value?.trim() || "alle";
}

export function parseCompaniesSearchParams(
  params: Record<string, string | string[] | undefined>,
): CompaniesFilterValues & { pagina: number } {
  return {
    zoeken: firstSearchParam(params, "zoeken").trim(),
    plaats: firstSearchParam(params, "plaats").trim(),
    land: firstSearchParam(params, "land").trim(),
    eigenaar: parseCompanyOwnerFilter(firstSearchParam(params, "eigenaar")),
    pagina: parsePageParam(firstSearchParam(params, "pagina")),
  };
}

export function buildCompaniesHref(values: CompaniesQueryValues): string {
  const query = new URLSearchParams();
  const eigenaar = parseCompanyOwnerFilter(values.eigenaar);
  setIfPresent(query, "zoeken", values.zoeken);
  setIfPresent(query, "plaats", values.plaats);
  setIfPresent(query, "land", values.land);
  if (eigenaar !== "alle") query.set("eigenaar", eigenaar);
  const pagina = Math.max(values.pagina ?? 1, 1);
  if (pagina > 1) query.set("pagina", String(pagina));
  return toListHref("/bedrijven", query);
}
