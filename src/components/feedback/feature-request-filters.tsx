"use client";

import { useEffect } from "react";
import {
  ListFilterToolbar,
  useDebouncedUrlSearch,
} from "@/components/list/list-filter-toolbar";
import { useListHrefReplace, useListNavigation } from "@/components/list/list-browser";
import { SelectMenu, type SelectOption } from "@/components/ui/select";
import {
  FEATURE_REQUEST_LIST_HREF_KEY,
  buildFeatureRequestHref,
  featureRequestSortLabels,
  featureRequestStatusFilterLabels,
  featureRequestStatusParams,
  featureRequestTypeFilterLabels,
  featureRequestTypeParams,
  type FeatureRequestFilterValues,
  type FeatureRequestSort,
  type FeatureRequestStatusFilter,
  type FeatureRequestTypeFilter,
} from "@/lib/feature-request-query";

export function FeatureRequestFilters({
  values,
}: {
  values: FeatureRequestFilterValues;
}) {
  const replace = useListHrefReplace();
  const { isPending } = useListNavigation();

  function navigate(next: Partial<FeatureRequestFilterValues>) {
    replace(
      buildFeatureRequestHref({
        ...values,
        ...next,
        pagina: 1,
      }),
    );
  }

  const search = useDebouncedUrlSearch(values.zoeken, (zoeken) =>
    navigate({ zoeken }),
  );

  useEffect(() => {
    sessionStorage.setItem(
      FEATURE_REQUEST_LIST_HREF_KEY,
      `${window.location.pathname}${window.location.search}`,
    );
  });

  const typeOptions: SelectOption<FeatureRequestTypeFilter>[] =
    featureRequestTypeParams.map((value) => ({
      value,
      label: featureRequestTypeFilterLabels[value],
    }));

  const statusOptions: SelectOption<FeatureRequestStatusFilter>[] =
    featureRequestStatusParams.map((value) => ({
      value,
      label: featureRequestStatusFilterLabels[value],
    }));

  const sortOptions: SelectOption<FeatureRequestSort>[] = [
    { value: "populair", label: featureRequestSortLabels.populair },
    { value: "nieuwste", label: featureRequestSortLabels.nieuwste },
  ];

  const chips = [
    values.type !== "alle"
      ? {
          key: "type",
          label: "Type",
          value: featureRequestTypeFilterLabels[values.type],
          onRemove: () => navigate({ type: "alle" }),
        }
      : null,
    values.status !== "actief"
      ? {
          key: "status",
          label: "Status",
          value: featureRequestStatusFilterLabels[values.status],
          onRemove: () => navigate({ status: "actief" }),
        }
      : null,
    values.sortering !== "populair"
      ? {
          key: "sortering",
          label: "Sortering",
          value: featureRequestSortLabels[values.sortering],
          onRemove: () => navigate({ sortering: "populair" }),
        }
      : null,
    values.mijnStemmen
      ? {
          key: "mijn-stemmen",
          label: "Mijn stemmen",
          value: "Aan",
          onRemove: () => navigate({ mijnStemmen: false }),
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
      values.type !== "alle" ||
      values.status !== "actief" ||
      values.sortering !== "populair" ||
      values.mijnStemmen,
  );

  return (
    <ListFilterToolbar
      searchValue={search.value}
      onSearchChange={search.onChange}
      onSearchClear={search.onClear}
      searchPlaceholder="Zoek op titel of omschrijving"
      searchAriaLabel="Zoek verzoeken"
      chips={chips}
      hasActiveFilters={hasActiveFilters}
      onReset={() => replace(buildFeatureRequestHref({ pagina: 1 }))}
      isPending={isPending}
    >
      <SelectMenu
        prefix="Type"
        aria-label="Filter op type"
        value={values.type}
        onValueChange={(next) =>
          navigate({ type: next as FeatureRequestTypeFilter })
        }
        items={typeOptions}
        className="w-full md:w-auto"
      />
      <SelectMenu
        prefix="Status"
        aria-label="Filter op status"
        value={values.status}
        onValueChange={(next) =>
          navigate({ status: next as FeatureRequestStatusFilter })
        }
        items={statusOptions}
        className="w-full md:w-auto"
      />
      <SelectMenu
        prefix="Sortering"
        aria-label="Sorteer verzoeken"
        value={values.sortering}
        onValueChange={(next) =>
          navigate({ sortering: next as FeatureRequestSort })
        }
        items={sortOptions}
        className="w-full md:w-auto"
      />
      <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border border-border bg-surface px-3.5 text-sm text-fg shadow-[var(--shadow-xs)] md:h-8 md:min-h-8 md:px-2.5">
        <input
          type="checkbox"
          checked={values.mijnStemmen}
          onChange={(event) => navigate({ mijnStemmen: event.target.checked })}
          className="size-3.5 rounded-xs border-border accent-fg"
          aria-label="Toon alleen verzoeken waarop ik heb gestemd"
        />
        <span className="whitespace-nowrap">Mijn stemmen</span>
      </label>
    </ListFilterToolbar>
  );
}
