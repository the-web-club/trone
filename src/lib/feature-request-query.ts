import {
  firstSearchParam,
  parsePageParam,
  setIfPresent,
  setUnlessDefault,
  toListHref,
} from "@/lib/list-query";
import type {
  FeatureRequestStatus,
  FeatureRequestType,
} from "@/lib/feature-request-validation";
import { featureRequestListPath } from "@/lib/paths";

export const featureRequestTypeParams = [
  "alle",
  "bug",
  "feature",
  "ux",
  "verbetering",
] as const;
export type FeatureRequestTypeFilter = (typeof featureRequestTypeParams)[number];

export const featureRequestStatusParams = [
  "actief",
  "alle",
  "open",
  "gepland",
  "bezig",
  "afgerond",
  "samengevoegd",
] as const;
export type FeatureRequestStatusFilter =
  (typeof featureRequestStatusParams)[number];

export const featureRequestSortParams = ["populair", "nieuwste"] as const;
export type FeatureRequestSort = (typeof featureRequestSortParams)[number];

export const featureRequestTypeParamByValue: Record<
  FeatureRequestType,
  Exclude<FeatureRequestTypeFilter, "alle">
> = {
  BUG: "bug",
  FEATURE: "feature",
  UX_DESIGN: "ux",
  IMPROVEMENT: "verbetering",
};

export const featureRequestTypeByParam: Record<
  Exclude<FeatureRequestTypeFilter, "alle">
, FeatureRequestType> = {
  bug: "BUG",
  feature: "FEATURE",
  ux: "UX_DESIGN",
  verbetering: "IMPROVEMENT",
};

export const featureRequestStatusParamByValue: Record<
  FeatureRequestStatus,
  Exclude<FeatureRequestStatusFilter, "actief" | "alle">
> = {
  OPEN: "open",
  PLANNED: "gepland",
  IN_PROGRESS: "bezig",
  DONE: "afgerond",
  MERGED: "samengevoegd",
};

export const featureRequestStatusByParam: Record<
  Exclude<FeatureRequestStatusFilter, "actief" | "alle">,
  FeatureRequestStatus
> = {
  open: "OPEN",
  gepland: "PLANNED",
  bezig: "IN_PROGRESS",
  afgerond: "DONE",
  samengevoegd: "MERGED",
};

export type FeatureRequestFilterValues = {
  zoeken: string;
  type: FeatureRequestTypeFilter;
  status: FeatureRequestStatusFilter;
  mijnStemmen: boolean;
  sortering: FeatureRequestSort;
};

export type FeatureRequestQueryValues = Partial<FeatureRequestFilterValues> & {
  pagina?: number;
};

function isTruthyFlag(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "ja" ||
    normalized === "on"
  );
}

export function parseFeatureRequestTypeFilter(
  value: string | null | undefined,
): FeatureRequestTypeFilter {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized &&
    featureRequestTypeParams.includes(normalized as FeatureRequestTypeFilter)
  ) {
    return normalized as FeatureRequestTypeFilter;
  }
  return "alle";
}

export function parseFeatureRequestStatusFilter(
  value: string | null | undefined,
): FeatureRequestStatusFilter {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized &&
    featureRequestStatusParams.includes(
      normalized as FeatureRequestStatusFilter,
    )
  ) {
    return normalized as FeatureRequestStatusFilter;
  }
  return "actief";
}

export function parseFeatureRequestSort(
  value: string | null | undefined,
): FeatureRequestSort {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "nieuwste") return "nieuwste";
  return "populair";
}

export function parseFeatureRequestSearchParams(
  params: Record<string, string | string[] | undefined>,
): FeatureRequestFilterValues & { pagina: number } {
  return {
    zoeken: firstSearchParam(params, "zoeken").trim(),
    type: parseFeatureRequestTypeFilter(firstSearchParam(params, "type")),
    status: parseFeatureRequestStatusFilter(firstSearchParam(params, "status")),
    mijnStemmen: isTruthyFlag(firstSearchParam(params, "mijn-stemmen")),
    sortering: parseFeatureRequestSort(firstSearchParam(params, "sortering")),
    pagina: parsePageParam(firstSearchParam(params, "pagina")),
  };
}

export function buildFeatureRequestHref(
  values: FeatureRequestQueryValues,
): string {
  const query = new URLSearchParams();
  setIfPresent(query, "zoeken", values.zoeken);
  setUnlessDefault(query, "type", values.type, "alle");
  setUnlessDefault(query, "status", values.status, "actief");
  if (values.mijnStemmen) query.set("mijn-stemmen", "1");
  setUnlessDefault(query, "sortering", values.sortering, "populair");
  const pagina = Math.max(values.pagina ?? 1, 1);
  if (pagina > 1) query.set("pagina", String(pagina));
  return toListHref(featureRequestListPath(), query);
}

export const featureRequestTypeFilterLabels: Record<
  FeatureRequestTypeFilter,
  string
> = {
  alle: "Alle typen",
  bug: "Bug",
  feature: "Feature",
  ux: "UX / Design",
  verbetering: "Verbetering",
};

export const featureRequestStatusFilterLabels: Record<
  FeatureRequestStatusFilter,
  string
> = {
  actief: "Actief",
  alle: "Alle statussen",
  open: "Open",
  gepland: "Gepland",
  bezig: "Bezig",
  afgerond: "Afgerond",
  samengevoegd: "Samengevoegd",
};

export const featureRequestSortLabels: Record<FeatureRequestSort, string> = {
  populair: "Populair",
  nieuwste: "Nieuwste",
};

export function statusValuesForFilter(
  filter: FeatureRequestStatusFilter,
): FeatureRequestStatus[] | undefined {
  if (filter === "alle") return undefined;
  if (filter === "actief") return ["OPEN", "PLANNED", "IN_PROGRESS"];
  return [featureRequestStatusByParam[filter]];
}

export function typeValueForFilter(
  filter: FeatureRequestTypeFilter,
): FeatureRequestType | undefined {
  if (filter === "alle") return undefined;
  return featureRequestTypeByParam[filter];
}

export const FEATURE_REQUEST_LIST_HREF_KEY = "trone:feedback-list-href";
