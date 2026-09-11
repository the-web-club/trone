import {
  normalizeDateOnlyInput,
} from "@/lib/date-input";
import {
  firstSearchParam,
  parsePageParam,
  setIfPresent,
  setUnlessDefault,
  toListHref,
} from "@/lib/list-query";
import { taskStatuses, type TaskStatusValue } from "@/lib/task-validation";

export type TaskAssigneeFilter = "aan-mij" | "alle" | string;

export type TaskStatusFilter = "open" | "done" | "cancelled" | "alle";

export type TaskWhenFilter =
  | "alle"
  | "achterstallig"
  | "vandaag"
  | "deze-week"
  | "later"
  | "zonder-datum";

export type TasksFilterValues = {
  zoeken: string;
  eigenaar: TaskAssigneeFilter;
  status: TaskStatusFilter;
  wanneer: TaskWhenFilter;
  van: string;
  tot: string;
};

export type TasksQueryValues = Partial<TasksFilterValues> & {
  pagina?: number;
};

export function parseTaskAssigneeFilter(
  value: string | null | undefined,
): TaskAssigneeFilter {
  const normalized = value?.trim() || "aan-mij";
  return normalized;
}

export function parseTaskStatusFilter(
  value: string | null | undefined,
): TaskStatusFilter {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "open" ||
    normalized === "done" ||
    normalized === "cancelled" ||
    normalized === "alle"
  ) {
    return normalized;
  }
  return "open";
}

export function parseTaskWhenFilter(
  value: string | null | undefined,
): TaskWhenFilter {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "achterstallig" ||
    normalized === "vandaag" ||
    normalized === "deze-week" ||
    normalized === "later" ||
    normalized === "zonder-datum"
  ) {
    return normalized;
  }
  return "alle";
}

export function taskStatusFilterToEnum(
  status: TaskStatusFilter,
): TaskStatusValue | null {
  if (status === "open") return "OPEN";
  if (status === "done") return "DONE";
  if (status === "cancelled") return "CANCELLED";
  return null;
}

export function parseTasksSearchParams(
  params: Record<string, string | string[] | undefined>,
): TasksFilterValues & { pagina: number } {
  return {
    zoeken: firstSearchParam(params, "zoeken").trim(),
    eigenaar: parseTaskAssigneeFilter(firstSearchParam(params, "eigenaar")),
    status: parseTaskStatusFilter(firstSearchParam(params, "status")),
    wanneer: parseTaskWhenFilter(firstSearchParam(params, "wanneer")),
    van: normalizeDateOnlyInput(firstSearchParam(params, "van")) ?? "",
    tot: normalizeDateOnlyInput(firstSearchParam(params, "tot")) ?? "",
    pagina: parsePageParam(firstSearchParam(params, "pagina")),
  };
}

export function buildTasksHref(values: TasksQueryValues): string {
  const query = new URLSearchParams();
  setIfPresent(query, "zoeken", values.zoeken);
  setUnlessDefault(query, "eigenaar", values.eigenaar, "aan-mij");
  setUnlessDefault(query, "status", values.status, "open");
  setUnlessDefault(query, "wanneer", values.wanneer, "alle");
  setIfPresent(query, "van", normalizeDateOnlyInput(values.van));
  setIfPresent(query, "tot", normalizeDateOnlyInput(values.tot));
  const pagina = Math.max(values.pagina ?? 1, 1);
  if (pagina > 1) query.set("pagina", String(pagina));
  return toListHref("/taken", query);
}

export const taskWhenLabels: Record<TaskWhenFilter, string> = {
  alle: "Alle periodes",
  achterstallig: "Achterstallig",
  vandaag: "Vandaag",
  "deze-week": "Deze week",
  later: "Later",
  "zonder-datum": "Zonder datum",
};

export const taskStatusFilterLabels: Record<TaskStatusFilter, string> = {
  open: "Open",
  done: "Afgerond",
  cancelled: "Geannuleerd",
  alle: "Alle",
};
