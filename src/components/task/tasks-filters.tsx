"use client";

import { DateRangeFields } from "@/components/list/date-range-fields";
import {
  ListFilterToolbar,
  useDebouncedUrlSearch,
} from "@/components/list/list-filter-toolbar";
import { useListHrefReplace, useListNavigation } from "@/components/list/list-browser";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectMenu, type SelectOption } from "@/components/ui/select";
import {
  buildTasksHref,
  DEFAULT_TASK_SCOPE,
  DEFAULT_TASK_STATUS,
  type TasksFilterValues,
} from "@/lib/tasks-query";
import { taskStatusLabels } from "@/lib/task-validation";

const statusOptions: SelectOption[] = [
  { value: "open", label: taskStatusLabels.OPEN },
  { value: "done", label: taskStatusLabels.DONE },
  { value: "cancelled", label: taskStatusLabels.CANCELLED },
  { value: "alle", label: "Alle statussen" },
];

export function TasksFilters({ values }: { values: TasksFilterValues }) {
  const replace = useListHrefReplace();
  const { isPending } = useListNavigation();

  function navigate(next: Partial<TasksFilterValues>) {
    replace(
      buildTasksHref({
        zoeken: next.zoeken ?? values.zoeken,
        scope: next.scope ?? values.scope,
        status: next.status ?? values.status,
        van: next.van ?? values.van,
        tot: next.tot ?? values.tot,
        pagina: 1,
      }),
    );
  }

  const search = useDebouncedUrlSearch(values.zoeken, (zoeken) =>
    navigate({ zoeken }),
  );

  const chips = [
    values.status !== DEFAULT_TASK_STATUS
      ? {
          key: "status",
          label: "Status",
          value:
            values.status === "alle"
              ? "Alle"
              : taskStatusLabels[
                  values.status === "done"
                    ? "DONE"
                    : values.status === "cancelled"
                      ? "CANCELLED"
                      : "OPEN"
                ],
          onRemove: () => navigate({ status: DEFAULT_TASK_STATUS }),
        }
      : null,
    values.van || values.tot
      ? {
          key: "periode",
          label: "Periode",
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
      values.scope !== DEFAULT_TASK_SCOPE ||
      values.status !== DEFAULT_TASK_STATUS ||
      values.van ||
      values.tot,
  );

  return (
    <ListFilterToolbar
      searchValue={search.value}
      onSearchChange={search.onChange}
      onSearchClear={search.onClear}
      searchPlaceholder="Zoek op titel"
      searchAriaLabel="Zoek taken"
      chips={chips}
      hasActiveFilters={hasActiveFilters}
      onReset={() =>
        replace(
          buildTasksHref({
            zoeken: "",
            scope: DEFAULT_TASK_SCOPE,
            status: DEFAULT_TASK_STATUS,
            van: "",
            tot: "",
            pagina: 1,
          }),
        )
      }
      isPending={isPending}
      moreCount={Number(Boolean(values.van || values.tot))}
      moreFilters={
        <DateRangeFields
          van={values.van}
          tot={values.tot}
          onVan={(van) => navigate({ van })}
          onTot={(tot) => navigate({ tot })}
        />
      }
    >
      <SegmentedControl
        aria-label="Taakoverzicht"
        value={values.scope}
        onValueChange={(scope) => navigate({ scope })}
        items={[
          { value: "aan-mij", label: "Aan mij" },
          { value: "door-mij", label: "Door mij" },
          { value: "alle", label: "Alle" },
        ]}
      />
      <SelectMenu
        prefix="Status"
        aria-label="Filter op status"
        value={values.status}
        onValueChange={(status) =>
          navigate({
            status: status as TasksFilterValues["status"],
          })
        }
        items={statusOptions}
        className="w-auto"
      />
    </ListFilterToolbar>
  );
}
