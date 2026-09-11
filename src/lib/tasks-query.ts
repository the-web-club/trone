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

export type TaskAssigneeFilter = "aan-mij" | "alle" | string;

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
  afgerond: boolean;
  wanneer: TaskWhenFilter;
  van: string;
  tot: string;
};

export type TasksQueryValues = Partial<TasksFilterValues> & {
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

export function parseTaskAssigneeFilter(
  value: string | null | undefined,
): TaskAssigneeFilter {
  const normalized = value?.trim() || "aan-mij";
  return normalized;
}

export function parseAfgerondFilter(
  params: Record<string, string | string[] | undefined>,
): boolean {
  if (isTruthyFlag(firstSearchParam(params, "afgerond"))) return true;
  const status = firstSearchParam(params, "status").trim().toLowerCase();
  return status === "done" || status === "alle";
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

export function parseTasksSearchParams(
  params: Record<string, string | string[] | undefined>,
): TasksFilterValues & { pagina: number } {
  return {
    zoeken: firstSearchParam(params, "zoeken").trim(),
    eigenaar: parseTaskAssigneeFilter(firstSearchParam(params, "eigenaar")),
    afgerond: parseAfgerondFilter(params),
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
  if (values.afgerond) query.set("afgerond", "1");
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
