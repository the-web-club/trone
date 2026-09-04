import { normalizeDateOnlyInput } from "@/lib/date-input";
import {
  firstSearchParam,
  parsePageParam,
  setIfPresent,
  toListHref,
} from "@/lib/list-query";
import { quoteStatuses, type QuoteStatusInput } from "@/lib/quote-validation";

export type QuotesFilterValues = {
  zoeken: string;
  status: string;
  klant: string;
  van: string;
  tot: string;
};

export type QuotesQueryValues = QuotesFilterValues & {
  pagina?: number;
};

export function parseQuoteStatusParam(
  value: string | null | undefined,
): QuoteStatusInput | "" {
  const normalized = value?.trim().toUpperCase() ?? "";
  return quoteStatuses.includes(normalized as QuoteStatusInput)
    ? (normalized as QuoteStatusInput)
    : "";
}

export function parseQuotesSearchParams(
  params: Record<string, string | string[] | undefined>,
): QuotesFilterValues & { pagina: number } {
  return {
    zoeken: firstSearchParam(params, "zoeken").trim(),
    status: parseQuoteStatusParam(firstSearchParam(params, "status")),
    klant: firstSearchParam(params, "klant").trim(),
    van: normalizeDateOnlyInput(firstSearchParam(params, "van")) ?? "",
    tot: normalizeDateOnlyInput(firstSearchParam(params, "tot")) ?? "",
    pagina: parsePageParam(firstSearchParam(params, "pagina")),
  };
}

export function buildQuotesHref(values: QuotesQueryValues): string {
  const query = new URLSearchParams();
  setIfPresent(query, "zoeken", values.zoeken);
  setIfPresent(query, "status", parseQuoteStatusParam(values.status));
  setIfPresent(query, "klant", values.klant);
  setIfPresent(query, "van", normalizeDateOnlyInput(values.van));
  setIfPresent(query, "tot", normalizeDateOnlyInput(values.tot));
  const pagina = Math.max(values.pagina ?? 1, 1);
  if (pagina > 1) query.set("pagina", String(pagina));
  return toListHref("/offertes", query);
}
