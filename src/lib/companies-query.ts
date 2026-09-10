import {
  firstSearchParam,
  parsePageParam,
  setIfPresent,
  toListHref,
} from "@/lib/list-query";

export type CompanyOwnerFilter = "alle" | "niet-toegewezen" | "aan-mij" | string;

export const COMPANY_LEADS_FILTERS = [
  "alle",
  "geen",
  "1",
  "2",
  "3",
  "4",
  "5plus",
] as const;

export type CompanyLeadsFilter = (typeof COMPANY_LEADS_FILTERS)[number];

export type CompanyOwnerFacets = {
  ownerTotal: number;
  unassignedOwner: number;
  assignedToMe: number;
  byOwner: Array<{ userId: string; count: number }>;
};

export type CompanyLeadFacets = {
  total: number;
  none: number;
  byCount: Record<"1" | "2" | "3" | "4" | "5plus", number>;
};

export type CompaniesFilterValues = {
  zoeken: string;
  plaats: string;
  land: string;
  eigenaar: string;
  leads: CompanyLeadsFilter;
};

export type CompaniesQueryValues = CompaniesFilterValues & {
  pagina?: number;
};

export function parseCompanyOwnerFilter(
  value: string | null | undefined,
): CompanyOwnerFilter {
  return value?.trim() || "alle";
}

export function parseCompanyLeadsFilter(
  value: string | null | undefined,
): CompanyLeadsFilter {
  const normalized = value?.trim().toLowerCase() || "alle";
  if (normalized === "geen" || normalized === "0") return "geen";
  if (
    normalized === "1" ||
    normalized === "2" ||
    normalized === "3" ||
    normalized === "4"
  ) {
    return normalized;
  }
  if (
    normalized === "5plus" ||
    normalized === "5+" ||
    normalized === "5-of-meer"
  ) {
    return "5plus";
  }
  return "alle";
}

export function companyLeadsFilterLabel(value: CompanyLeadsFilter): string {
  if (value === "geen") return "Geen leads";
  if (value === "1") return "1 lead";
  if (value === "2") return "2 leads";
  if (value === "3") return "3 leads";
  if (value === "4") return "4 leads";
  if (value === "5plus") return "5 of meer";
  return "Alle";
}

export function parseCompaniesSearchParams(
  params: Record<string, string | string[] | undefined>,
): CompaniesFilterValues & { pagina: number } {
  return {
    zoeken: firstSearchParam(params, "zoeken").trim(),
    plaats: firstSearchParam(params, "plaats").trim(),
    land: firstSearchParam(params, "land").trim(),
    eigenaar: parseCompanyOwnerFilter(firstSearchParam(params, "eigenaar")),
    leads: parseCompanyLeadsFilter(firstSearchParam(params, "leads")),
    pagina: parsePageParam(firstSearchParam(params, "pagina")),
  };
}

export function buildCompaniesHref(values: CompaniesQueryValues): string {
  const query = new URLSearchParams();
  const eigenaar = parseCompanyOwnerFilter(values.eigenaar);
  const leads = parseCompanyLeadsFilter(values.leads);
  setIfPresent(query, "zoeken", values.zoeken);
  setIfPresent(query, "plaats", values.plaats);
  setIfPresent(query, "land", values.land);
  if (eigenaar !== "alle") query.set("eigenaar", eigenaar);
  if (leads !== "alle") query.set("leads", leads);
  const pagina = Math.max(values.pagina ?? 1, 1);
  if (pagina > 1) query.set("pagina", String(pagina));
  return toListHref("/bedrijven", query);
}
