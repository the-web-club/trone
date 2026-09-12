"use client";

import { DateRangeFields } from "@/components/list/date-range-fields";
import {
  ListFilterToolbar,
  useDebouncedUrlSearch,
} from "@/components/list/list-filter-toolbar";
import { useListHrefReplace, useListNavigation } from "@/components/list/list-browser";
import { SelectMenu, type SelectOption } from "@/components/ui/select";
import type { DealTeamMember } from "@/lib/deal-service";
import type { TaskFilterFacets } from "@/lib/task-service";
import {
  buildTasksHref,
  taskWhenLabels,
  type TaskWhenFilter,
  type TasksFilterValues,
} from "@/lib/tasks-query";

function count(value: number | undefined): string {
  return String(typeof value === "number" ? value : 0);
}

export function TasksFilters({
  values,
  members,
  facets,
}: {
  values: TasksFilterValues;
  members: DealTeamMember[];
  facets: TaskFilterFacets;
}) {
  const replace = useListHrefReplace();
  const { isPending } = useListNavigation();

  function navigate(next: Partial<TasksFilterValues>) {
    replace(
      buildTasksHref({
        ...values,
        ...next,
        pagina: 1,
      }),
    );
  }

  const search = useDebouncedUrlSearch(values.zoeken, (zoeken) =>
    navigate({ zoeken }),
  );

  const assigneeCount = new Map(
    facets.byAssignee.map((item) => [item.userId, item.count]),
  );
  const memberLabel = new Map(
    members.map((member) => [member.id, member.name || member.email]),
  );

  const assigneeOptions: SelectOption[] = [
    { value: "aan-mij", label: "Aan mij", hint: count(facets.assignedToMe) },
    { value: "alle", label: "Iedereen", hint: count(facets.assigneeTotal) },
    ...members.map((member) => ({
      value: member.id,
      label: member.name || member.email,
      hint: count(assigneeCount.get(member.id)),
      image: member.image,
    })),
  ];

  const whenOptions: SelectOption<TaskWhenFilter>[] = [
    { value: "alle", label: taskWhenLabels.alle },
    { value: "achterstallig", label: taskWhenLabels.achterstallig },
    { value: "vandaag", label: taskWhenLabels.vandaag },
    { value: "deze-week", label: taskWhenLabels["deze-week"] },
    { value: "later", label: taskWhenLabels.later },
    { value: "zonder-datum", label: taskWhenLabels["zonder-datum"] },
  ];

  const assigneeLabel =
    values.eigenaar === "aan-mij"
      ? "Aan mij"
      : values.eigenaar === "alle"
        ? "Iedereen"
        : (memberLabel.get(values.eigenaar) ?? values.eigenaar);

  const hasDate = Boolean(values.van || values.tot);
  const chips = [
    values.eigenaar !== "aan-mij"
      ? {
          key: "eigenaar",
          label: "Toegewezen",
          value: assigneeLabel,
          onRemove: () => navigate({ eigenaar: "aan-mij" }),
        }
      : null,
    values.afgerond
      ? {
          key: "afgerond",
          label: "Afgeronde taken",
          value: "Aan",
          onRemove: () => navigate({ afgerond: false }),
        }
      : null,
    values.wanneer !== "alle"
      ? {
          key: "wanneer",
          label: "Wanneer",
          value: taskWhenLabels[values.wanneer],
          onRemove: () => navigate({ wanneer: "alle" }),
        }
      : null,
    hasDate
      ? {
          key: "datum",
          label: "Datumbereik",
          value: [values.van, values.tot].filter(Boolean).join(" – "),
          onRemove: () => navigate({ van: "", tot: "" }),
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: string;
    onRemove: () => void;
  }>;

  const hasActiveFilters = Boolean(
    values.zoeken ||
      values.eigenaar !== "aan-mij" ||
      values.afgerond ||
      values.wanneer !== "alle" ||
      hasDate,
  );

  const moreCount = hasDate ? 1 : 0;

  return (
    <ListFilterToolbar
      searchValue={search.value}
      onSearchChange={search.onChange}
      onSearchClear={search.onClear}
      searchPlaceholder="Zoek op titel, lead of klant"
      searchAriaLabel="Zoek taken"
      chips={chips}
      moreCount={moreCount}
      moreFilters={
        <DateRangeFields
          van={values.van}
          tot={values.tot}
          onVan={(van) => navigate({ van })}
          onTot={(tot) => navigate({ tot })}
        />
      }
      hasActiveFilters={hasActiveFilters}
      onReset={() => replace(buildTasksHref({ pagina: 1 }))}
      isPending={isPending}
    >
      <SelectMenu
        prefix="Toegewezen"
        aria-label="Filter op toegewezen persoon"
        value={values.eigenaar}
        onValueChange={(next) => navigate({ eigenaar: next })}
        items={assigneeOptions}
        contentClassName="min-w-[14rem]"
        className="w-full max-w-none md:w-auto md:max-w-[16rem]"
      />
      <SelectMenu
        prefix="Wanneer"
        aria-label="Filter op deadline"
        value={values.wanneer}
        onValueChange={(next) =>
          navigate({ wanneer: next as TaskWhenFilter })
        }
        items={whenOptions}
        className="w-full md:w-auto"
      />
      <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border border-border bg-surface px-3.5 text-sm text-fg shadow-[var(--shadow-xs)] md:h-8 md:min-h-8 md:px-2.5">
        <input
          type="checkbox"
          checked={values.afgerond}
          onChange={(event) => navigate({ afgerond: event.target.checked })}
          className="size-3.5 rounded-xs border-border accent-fg"
          aria-label="Toon afgeronde taken"
        />
        <span className="flex items-baseline gap-1.5 whitespace-nowrap">
          Afgeronde taken
          <span className="text-xs text-fg-muted tabular-nums">
            {count(facets.byStatus.DONE)}
          </span>
        </span>
      </label>
    </ListFilterToolbar>
  );
}
