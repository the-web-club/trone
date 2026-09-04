import {
  firstSearchParam,
  parsePageParam,
  setIfPresent,
  setUnlessDefault,
  toListHref,
} from "@/lib/list-query";

export const taskScopes = ["aan-mij", "door-mij", "alle"] as const;
export type TaskScope = (typeof taskScopes)[number];

export const taskStatusFilters = ["open", "done", "cancelled", "alle"] as const;
export type TaskStatusFilter = (typeof taskStatusFilters)[number];

export const DEFAULT_TASK_SCOPE: TaskScope = "aan-mij";
export const DEFAULT_TASK_STATUS: TaskStatusFilter = "open";

export type TasksFilterValues = {
  zoeken: string;
  scope: TaskScope;
  status: TaskStatusFilter;
  van: string;
  tot: string;
};

export type TasksQueryValues = TasksFilterValues & {
  pagina?: number;
};

function parseScope(value: string): TaskScope {
  return taskScopes.includes(value as TaskScope)
    ? (value as TaskScope)
    : DEFAULT_TASK_SCOPE;
}

function parseStatus(value: string): TaskStatusFilter {
  const normalized = value.trim().toLowerCase();
  return taskStatusFilters.includes(normalized as TaskStatusFilter)
    ? (normalized as TaskStatusFilter)
    : DEFAULT_TASK_STATUS;
}

export function parseTasksSearchParams(
  params: Record<string, string | string[] | undefined>,
): TasksFilterValues & { pagina: number } {
  return {
    zoeken: firstSearchParam(params, "zoeken").trim(),
    scope: parseScope(firstSearchParam(params, "scope")),
    status: parseStatus(firstSearchParam(params, "status")),
    van: firstSearchParam(params, "van").trim(),
    tot: firstSearchParam(params, "tot").trim(),
    pagina: parsePageParam(firstSearchParam(params, "pagina")),
  };
}

export function buildTasksHref(values: TasksQueryValues): string {
  const query = new URLSearchParams();
  setIfPresent(query, "zoeken", values.zoeken);
  setUnlessDefault(query, "scope", values.scope, DEFAULT_TASK_SCOPE);
  setUnlessDefault(query, "status", values.status, DEFAULT_TASK_STATUS);
  setIfPresent(query, "van", values.van);
  setIfPresent(query, "tot", values.tot);
  const pagina = Math.max(values.pagina ?? 1, 1);
  if (pagina > 1) query.set("pagina", String(pagina));
  return toListHref("/taken", query);
}
