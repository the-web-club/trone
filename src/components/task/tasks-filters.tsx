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
  taskStatusFilterLabels,
  taskWhenLabels,
  type TaskStatusFilter,
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

  const statusOptions: SelectOption<TaskStatusFilter>[] = [
    { value: "open", label: "Open", hint: count(facets.byStatus.OPEN) },
    { value: "done", label: "Afgerond", hint: count(facets.byStatus.DONE) },
    {
      value: "cancelled",
      label: "Geannuleerd",
      hint: count(facets.byStatus.CANCELLED),
    },
    { value: "alle", label: "Alle statussen", hint: count(facets.statusTotal) },
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
    values.status !== "open"
      ? {
          key: "status",
          label: "Status",
          value: taskStatusFilterLabels[values.status],
          onRemove: () => navigate({ status: "open" }),
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
      values.status !== "open" ||
      values.wanneer !== "alle" ||
      hasDate,
  );

  return (
    <ListFilterToolbar
      searchValue={search.value}
      onSearchChange={search.onChange}
      onSearchClear={search.onClear}
      searchPlaceholder="Zoek op titel, lead of klant"
      searchAriaLabel="Zoek taken"
      chips={chips}
      moreCount={hasDate ? 1 : 0}
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
        className="w-auto max-w-[16rem]"
      />
      <SelectMenu
        prefix="Status"
        aria-label="Filter op status"
        value={values.status}
        onValueChange={(next) =>
          navigate({ status: next as TaskStatusFilter })
        }
        items={statusOptions}
        className="w-auto"
      />
      <SelectMenu
        prefix="Wanneer"
        aria-label="Filter op deadline"
        value={values.wanneer}
        onValueChange={(next) =>
          navigate({ wanneer: next as TaskWhenFilter })
        }
        items={whenOptions}
        className="w-auto"
      />
    </ListFilterToolbar>
  );
}
