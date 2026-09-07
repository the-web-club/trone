export const LIST_PAGE_SIZE = 25;
export const LIST_SEARCH_MIN_ALPHANUMERIC = 3;

/** Letters and digits only; spaces and punctuation do not count toward the minimum. */
export function alphanumericLength(value: string): number {
  return value.replace(/[^\p{L}\p{N}]/gu, "").length;
}

/** Empty when the term is blank or has too few letters/digits to search. */
export function effectiveSearchQuery(
  value: string | null | undefined,
  minAlphanumeric = LIST_SEARCH_MIN_ALPHANUMERIC,
): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  if (alphanumericLength(trimmed) < minAlphanumeric) return "";
  return trimmed;
}

export function firstSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function parsePageParam(value: string | null | undefined): number {
  return Math.max(Number(value || "1") || 1, 1);
}

export function toListHref(path: string, query: URLSearchParams): string {
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

export function setIfPresent(
  query: URLSearchParams,
  key: string,
  value: string | number | null | undefined,
): void {
  if (value == null) return;
  const normalized = String(value).trim();
  if (!normalized) return;
  query.set(key, normalized);
}

export function setUnlessDefault(
  query: URLSearchParams,
  key: string,
  value: string | null | undefined,
  fallback: string,
): void {
  const normalized = value?.trim() || fallback;
  if (normalized !== fallback) query.set(key, normalized);
}

export type PagedList<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function paginateArgs(page?: number, pageSize?: number) {
  const size = Math.min(Math.max(pageSize ?? LIST_PAGE_SIZE, 1), 100);
  const current = Math.max(page ?? 1, 1);
  return {
    page: current,
    pageSize: size,
    skip: (current - 1) * size,
    take: size,
  };
}
