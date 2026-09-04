"use client";

import {
  ListFilterToolbar,
  useDebouncedUrlSearch,
} from "@/components/list/list-filter-toolbar";
import { useListHrefReplace, useListNavigation } from "@/components/list/list-browser";
import { SelectMenu, type SelectOption } from "@/components/ui/select";
import {
  buildCompaniesHref,
  type CompaniesFilterValues,
} from "@/lib/companies-query";
import { countryLabel } from "@/lib/list-copy";

const ALL = "__alle__";

export function CompaniesFilters({
  values,
  cities,
  countries,
}: {
  values: CompaniesFilterValues;
  cities: string[];
  countries: string[];
}) {
  const replace = useListHrefReplace();
  const { isPending } = useListNavigation();

  function navigate(next: Partial<CompaniesFilterValues>) {
    replace(
      buildCompaniesHref({
        zoeken: next.zoeken ?? values.zoeken,
        plaats: next.plaats ?? values.plaats,
        land: next.land ?? values.land,
        pagina: 1,
      }),
    );
  }

  const search = useDebouncedUrlSearch(values.zoeken, (zoeken) =>
    navigate({ zoeken }),
  );

  const cityOptions: SelectOption[] = [
    { value: ALL, label: "Alle plaatsen" },
    ...cities.map((city) => ({ value: city, label: city })),
  ];
  const countryOptions: SelectOption[] = [
    { value: ALL, label: "Alle landen" },
    ...countries.map((country) => ({
      value: country,
      label: countryLabel(country),
    })),
  ];

  const chips = [
    values.plaats
      ? {
          key: "plaats",
          label: "Plaats",
          value: values.plaats,
          onRemove: () => navigate({ plaats: "" }),
        }
      : null,
    values.land
      ? {
          key: "land",
          label: "Land",
          value: countryLabel(values.land),
          onRemove: () => navigate({ land: "" }),
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
      searchPlaceholder="Zoek op naam"
      searchAriaLabel="Zoek bedrijven"
      chips={chips}
      hasActiveFilters={Boolean(values.zoeken || values.plaats || values.land)}
      onReset={() => replace(buildCompaniesHref({ zoeken: "", plaats: "", land: "", pagina: 1 }))}
      isPending={isPending}
    >
      <SelectMenu
        prefix="Plaats"
        aria-label="Filter op plaats"
        value={values.plaats || ALL}
        onValueChange={(next) => navigate({ plaats: next === ALL ? "" : next })}
        items={cityOptions}
        className="w-auto"
      />
      <SelectMenu
        prefix="Land"
        aria-label="Filter op land"
        value={values.land || ALL}
        onValueChange={(next) => navigate({ land: next === ALL ? "" : next })}
        items={countryOptions}
        className="w-auto"
      />
    </ListFilterToolbar>
  );
}
