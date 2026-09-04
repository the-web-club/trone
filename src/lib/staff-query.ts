import {
  firstSearchParam,
  parsePageParam,
  setIfPresent,
  setUnlessDefault,
  toListHref,
} from "@/lib/list-query";
import { staffStatuses, userRoles, type StaffStatus, type UserRole } from "@/lib/user-validation";

export type StaffFilterValues = {
  zoeken: string;
  rol: string;
  status: string;
};

export type StaffQueryValues = StaffFilterValues & {
  pagina?: number;
};

export function parseStaffRoleParam(value: string | null | undefined): UserRole | "" {
  const normalized = value?.trim().toLowerCase() ?? "";
  return userRoles.includes(normalized as UserRole) ? (normalized as UserRole) : "";
}

export function parseStaffStatusParam(
  value: string | null | undefined,
): StaffStatus | "" {
  const normalized = value?.trim().toLowerCase() ?? "";
  return staffStatuses.includes(normalized as StaffStatus)
    ? (normalized as StaffStatus)
    : "";
}

export function parseStaffSearchParams(
  params: Record<string, string | string[] | undefined>,
): StaffFilterValues & { pagina: number } {
  return {
    zoeken: firstSearchParam(params, "zoeken").trim(),
    rol: parseStaffRoleParam(firstSearchParam(params, "rol")),
    status: parseStaffStatusParam(firstSearchParam(params, "status")),
    pagina: parsePageParam(firstSearchParam(params, "pagina")),
  };
}

export function buildStaffHref(values: StaffQueryValues): string {
  const query = new URLSearchParams();
  setIfPresent(query, "zoeken", values.zoeken);
  setUnlessDefault(query, "rol", values.rol, "");
  setUnlessDefault(query, "status", values.status, "");
  const pagina = Math.max(values.pagina ?? 1, 1);
  if (pagina > 1) query.set("pagina", String(pagina));
  return toListHref("/instellingen/medewerkers", query);
}
