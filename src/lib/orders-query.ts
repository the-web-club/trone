import { normalizeDateOnlyInput } from "@/lib/date-input";
import {
  firstSearchParam,
  parsePageParam,
  setIfPresent,
  toListHref,
} from "@/lib/list-query";

export const orderStatuses = [
  "NEW",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatusFilter = (typeof orderStatuses)[number];

export const orderStatusLabels: Record<OrderStatusFilter, string> = {
  NEW: "Nieuw",
  CONFIRMED: "Bevestigd",
  IN_PRODUCTION: "In productie",
  READY: "Gereed",
  SHIPPED: "Verzonden",
  DELIVERED: "Geleverd",
  CANCELLED: "Geannuleerd",
};

export const orderStatusTones = {
  NEW: "info",
  CONFIRMED: "info",
  IN_PRODUCTION: "warning",
  READY: "warning",
  SHIPPED: "default",
  DELIVERED: "success",
  CANCELLED: "danger",
} as const;

export type OrdersFilterValues = {
  zoeken: string;
  status: string;
  klant: string;
  van: string;
  tot: string;
};

export type OrdersQueryValues = OrdersFilterValues & {
  pagina?: number;
};

export function parseOrderStatusParam(
  value: string | null | undefined,
): OrderStatusFilter | "" {
  const normalized = value?.trim().toUpperCase() ?? "";
  return orderStatuses.includes(normalized as OrderStatusFilter)
    ? (normalized as OrderStatusFilter)
    : "";
}

export function parseOrdersSearchParams(
  params: Record<string, string | string[] | undefined>,
): OrdersFilterValues & { pagina: number } {
  return {
    zoeken: firstSearchParam(params, "zoeken").trim(),
    status: parseOrderStatusParam(firstSearchParam(params, "status")),
    klant: firstSearchParam(params, "klant").trim(),
    van: normalizeDateOnlyInput(firstSearchParam(params, "van")) ?? "",
    tot: normalizeDateOnlyInput(firstSearchParam(params, "tot")) ?? "",
    pagina: parsePageParam(firstSearchParam(params, "pagina")),
  };
}

export function buildOrdersHref(values: OrdersQueryValues): string {
  const query = new URLSearchParams();
  setIfPresent(query, "zoeken", values.zoeken);
  setIfPresent(query, "status", parseOrderStatusParam(values.status));
  setIfPresent(query, "klant", values.klant);
  setIfPresent(query, "van", normalizeDateOnlyInput(values.van));
  setIfPresent(query, "tot", normalizeDateOnlyInput(values.tot));
  const pagina = Math.max(values.pagina ?? 1, 1);
  if (pagina > 1) query.set("pagina", String(pagina));
  return toListHref("/orders", query);
}
