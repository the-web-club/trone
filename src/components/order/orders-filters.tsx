"use client";

import { DateRangeFields } from "@/components/list/date-range-fields";
import {
  ListFilterToolbar,
  useDebouncedUrlSearch,
} from "@/components/list/list-filter-toolbar";
import { useListHrefReplace, useListNavigation } from "@/components/list/list-browser";
import { SelectMenu, type SelectOption } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import {
  buildOrdersHref,
  orderStatusLabels,
  orderStatuses,
  type OrdersFilterValues,
} from "@/lib/orders-query";

const ALL = "__alle__";

function formatDateLabel(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return formatDate(date);
}

export function OrdersFilters({
  values,
  companies,
}: {
  values: OrdersFilterValues;
  companies: Array<{ id: string; name: string }>;
}) {
  const replace = useListHrefReplace();
  const { isPending } = useListNavigation();

  function navigate(next: Partial<OrdersFilterValues>) {
    replace(
      buildOrdersHref({
        zoeken: next.zoeken ?? values.zoeken,
        status: next.status ?? values.status,
        klant: next.klant ?? values.klant,
        van: next.van ?? values.van,
        tot: next.tot ?? values.tot,
        pagina: 1,
      }),
    );
  }

  const search = useDebouncedUrlSearch(values.zoeken, (zoeken) =>
    navigate({ zoeken }),
  );

  const statusOptions: SelectOption[] = [
    { value: ALL, label: "Alle statussen" },
    ...orderStatuses.map((status) => ({
      value: status,
      label: orderStatusLabels[status],
    })),
  ];
  const companyOptions: SelectOption[] = [
    { value: ALL, label: "Alle klanten" },
    ...companies.map((company) => ({ value: company.id, label: company.name })),
  ];

  const hasDate = Boolean(values.van || values.tot);
  const chips = [
    values.status
      ? {
          key: "status",
          label: "Status",
          value:
            orderStatusLabels[values.status as keyof typeof orderStatusLabels] ??
            values.status,
          onRemove: () => navigate({ status: "" }),
        }
      : null,
    values.klant
      ? {
          key: "klant",
          label: "Klant",
          value:
            companies.find((company) => company.id === values.klant)?.name ??
            values.klant,
          onRemove: () => navigate({ klant: "" }),
        }
      : null,
    hasDate
      ? {
          key: "datum",
          label: "Datum",
          value: values.van
            ? values.tot
              ? `${formatDateLabel(values.van)} – ${formatDateLabel(values.tot)}`
              : `vanaf ${formatDateLabel(values.van)}`
            : `tot ${formatDateLabel(values.tot)}`,
          onRemove: () => navigate({ van: "", tot: "" }),
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: string;
    onRemove: () => void;
  }>;

  return (
    <ListFilterToolbar
      searchValue={search.value}
      onSearchChange={search.onChange}
      onSearchClear={search.onClear}
      searchPlaceholder="Zoek op nummer of klant"
      searchAriaLabel="Zoek orders"
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
      hasActiveFilters={Boolean(
        values.zoeken || values.status || values.klant || hasDate,
      )}
      onReset={() =>
        replace(
          buildOrdersHref({
            zoeken: "",
            status: "",
            klant: "",
            van: "",
            tot: "",
            pagina: 1,
          }),
        )
      }
      isPending={isPending}
    >
      <SelectMenu
        prefix="Status"
        aria-label="Filter op productiestatus"
        value={values.status || ALL}
        onValueChange={(next) => navigate({ status: next === ALL ? "" : next })}
        items={statusOptions}
        className="w-full md:w-auto"
      />
      <SelectMenu
        prefix="Klant"
        aria-label="Filter op klant"
        value={values.klant || ALL}
        onValueChange={(next) => navigate({ klant: next === ALL ? "" : next })}
        items={companyOptions}
        contentClassName="min-w-[14rem]"
        className="w-full max-w-none md:w-auto md:max-w-[16rem]"
      />
    </ListFilterToolbar>
  );
}
