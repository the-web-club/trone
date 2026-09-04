import {
  firstSearchParam,
  parsePageParam,
  setIfPresent,
  toListHref,
} from "@/lib/list-query";

export type CompaniesFilterValues = {
  zoeken: string;
  plaats: string;
  land: string;
};

export type CompaniesQueryValues = CompaniesFilterValues & {
  pagina?: number;
};

export function parseCompaniesSearchParams(
  params: Record<string, string | string[] | undefined>,
): CompaniesFilterValues & { pagina: number } {
  return {
    zoeken: firstSearchParam(params, "zoeken").trim(),
    plaats: firstSearchParam(params, "plaats").trim(),
    land: firstSearchParam(params, "land").trim(),
    pagina: parsePageParam(firstSearchParam(params, "pagina")),
  };
}

export function buildCompaniesHref(values: CompaniesQueryValues): string {
  const query = new URLSearchParams();
  setIfPresent(query, "zoeken", values.zoeken);
  setIfPresent(query, "plaats", values.plaats);
  setIfPresent(query, "land", values.land);
  const pagina = Math.max(values.pagina ?? 1, 1);
  if (pagina > 1) query.set("pagina", String(pagina));
  return toListHref("/bedrijven", query);
}
