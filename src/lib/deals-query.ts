import { normalizeDateOnlyInput, parseAmountInput } from "@/lib/date-input";

export type DealsView = "lijst" | "kanban";

export type DealOwnerFilter = "alle" | "niet-toegewezen" | "aan-mij" | string;

export type DealStatusFilter = "alle" | "open" | "won" | "lost";

export type DealSort = "nieuwste" | "oudste" | "gewijzigd";

export type DealDateField = "aangemaakt" | "verwacht";

export type DealsQueryValues = {
  zoeken?: string;
  fase?: string;
  bron?: string;
  eigenaar?: string;
  status?: string;
  waardeMin?: string;
  waardeMax?: string;
  van?: string;
  tot?: string;
  datumveld?: string;
  sortering?: string;
  pagina?: number;
  view?: DealsView | string | null;
};

export type DealsFilterValues = {
  zoeken: string;
  fase: string;
  bron: string;
  eigenaar: string;
  status: DealStatusFilter;
  waardeMin: string;
  waardeMax: string;
  van: string;
  tot: string;
  datumveld: DealDateField;
  sortering: DealSort;
};

export function parseDealsView(
  value: string | null | undefined,
): DealsView {
  return value?.trim().toLowerCase() === "kanban" ? "kanban" : "lijst";
}

export function parseDealOwnerFilter(
  value: string | null | undefined,
): DealOwnerFilter {
  const normalized = value?.trim() || "alle";
  return normalized;
}

export function parseDealStatusFilter(
  value: string | null | undefined,
): DealStatusFilter {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "open" || normalized === "won" || normalized === "lost") {
    return normalized;
  }
  return "alle";
}

export function parseDealSort(
  value: string | null | undefined,
): DealSort {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "oudste" || normalized === "gewijzigd") {
    return normalized;
  }
  return "nieuwste";
}

export function parseDealDateField(
  value: string | null | undefined,
): DealDateField {
  return value?.trim().toLowerCase() === "verwacht" ? "verwacht" : "aangemaakt";
}

function firstParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function parseDealsSearchParams(
  params: Record<string, string | string[] | undefined>,
): DealsFilterValues & { pagina: number; view: DealsView } {
  const view = parseDealsView(firstParam(params, "view"));
  return {
    zoeken: firstParam(params, "zoeken").trim(),
    fase: view === "kanban" ? "" : firstParam(params, "fase").trim(),
    bron: firstParam(params, "bron").trim(),
    eigenaar: parseDealOwnerFilter(firstParam(params, "eigenaar")),
    status: parseDealStatusFilter(firstParam(params, "status")),
    waardeMin: parseAmountInput(firstParam(params, "waarde-min"))?.toString() ?? "",
    waardeMax: parseAmountInput(firstParam(params, "waarde-max"))?.toString() ?? "",
    van: normalizeDateOnlyInput(firstParam(params, "van")) ?? "",
    tot: normalizeDateOnlyInput(firstParam(params, "tot")) ?? "",
    datumveld: parseDealDateField(firstParam(params, "datumveld")),
    sortering: parseDealSort(firstParam(params, "sortering")),
    pagina: Math.max(Number(firstParam(params, "pagina") || "1") || 1, 1),
    view,
  };
}

function buildDealsFilterQuery(values: DealsQueryValues): URLSearchParams {
  const query = new URLSearchParams();
  const zoeken = values.zoeken?.trim() ?? "";
  const fase = values.fase?.trim() ?? "";
  const bron = values.bron?.trim() ?? "";
  const eigenaar = parseDealOwnerFilter(values.eigenaar);
  const status = parseDealStatusFilter(values.status);
  const waardeMin = parseAmountInput(values.waardeMin);
  const waardeMax = parseAmountInput(values.waardeMax);
  const van = normalizeDateOnlyInput(values.van) ?? "";
  const tot = normalizeDateOnlyInput(values.tot) ?? "";
  const datumveld = parseDealDateField(values.datumveld);
  const sortering = parseDealSort(values.sortering);

  if (zoeken) query.set("zoeken", zoeken);
  if (fase) query.set("fase", fase);
  if (bron) query.set("bron", bron);
  if (eigenaar !== "alle") query.set("eigenaar", eigenaar);
  if (status !== "alle") query.set("status", status);
  if (waardeMin != null) query.set("waarde-min", String(waardeMin));
  if (waardeMax != null) query.set("waarde-max", String(waardeMax));
  if (van) query.set("van", van);
  if (tot) query.set("tot", tot);
  if (datumveld !== "aangemaakt" && (van || tot)) {
    query.set("datumveld", datumveld);
  }
  if (sortering !== "nieuwste") query.set("sortering", sortering);

  return query;
}

export function buildDealsHref(values: DealsQueryValues): string {
  const query = buildDealsFilterQuery(values);
  const pagina = Math.max(values.pagina ?? 1, 1);
  const view = parseDealsView(values.view);

  if (pagina > 1) query.set("pagina", String(pagina));
  if (view !== "lijst") query.set("view", view);

  const qs = query.toString();
  return qs ? `/leads?${qs}` : "/leads";
}

export function buildDealsExportHref(
  values: Omit<DealsQueryValues, "pagina" | "view">,
): string {
  const query = buildDealsFilterQuery(values);
  const qs = query.toString();
  return qs ? `/leads/exporteren?${qs}` : "/leads/exporteren";
}
