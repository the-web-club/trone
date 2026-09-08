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
  type CompanyOwnerFacets,
} from "@/lib/companies-query";
import type { DealTeamMember } from "@/lib/deal-service";
import { countryLabel } from "@/lib/list-copy";

const ALL = "__alle__";

function count(value: number | undefined): string {
  return String(typeof value === "number" ? value : 0);
}

export function CompaniesFilters({
  values,
  cities,
  countries,
  members,
  facets,
}: {
  values: CompaniesFilterValues;
  cities: string[];
  countries: string[];
  members: DealTeamMember[];
  facets: CompanyOwnerFacets;
}) {
  const replace = useListHrefReplace();
  const { isPending } = useListNavigation();

  function navigate(next: Partial<CompaniesFilterValues>) {
    replace(
      buildCompaniesHref({
        zoeken: next.zoeken ?? values.zoeken,
        plaats: next.plaats ?? values.plaats,
        land: next.land ?? values.land,
        eigenaar: next.eigenaar ?? values.eigenaar,
        pagina: 1,
      }),
    );
  }

  const search = useDebouncedUrlSearch(values.zoeken, (zoeken) =>
    navigate({ zoeken }),
  );

  const ownerCount = new Map(facets.byOwner.map((item) => [item.userId, item.count]));
  const memberLabel = new Map(
    members.map((member) => [member.id, member.name || member.email]),
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
  const ownerOptions: SelectOption[] = [
    { value: "alle", label: "Alle", hint: count(facets.ownerTotal) },
    {
      value: "niet-toegewezen",
      label: "Niet toegewezen",
      hint: count(facets.unassignedOwner),
    },
    { value: "aan-mij", label: "Aan mij", hint: count(facets.assignedToMe) },
    ...members.map((member) => ({
      value: member.id,
      label: member.name || member.email,
      hint: count(ownerCount.get(member.id)),
      image: member.image,
    })),
  ];

  const ownerLabel =
    values.eigenaar === "alle"
      ? "Alle"
      : values.eigenaar === "niet-toegewezen"
        ? "Niet toegewezen"
        : values.eigenaar === "aan-mij"
          ? "Aan mij"
          : (memberLabel.get(values.eigenaar) ?? values.eigenaar);

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
    values.eigenaar !== "alle"
      ? {
          key: "eigenaar",
          label: "Eigenaar",
          value: ownerLabel,
          onRemove: () => navigate({ eigenaar: "alle" }),
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
      hasActiveFilters={Boolean(
        values.zoeken || values.plaats || values.land || values.eigenaar !== "alle",
      )}
      onReset={() =>
        replace(
          buildCompaniesHref({
            zoeken: "",
            plaats: "",
            land: "",
            eigenaar: "alle",
            pagina: 1,
          }),
        )
      }
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
      <SelectMenu
        prefix="Eigenaar"
        aria-label="Filter op eigenaar"
        value={values.eigenaar}
        onValueChange={(next) => navigate({ eigenaar: next })}
        items={ownerOptions}
        contentClassName="min-w-[16rem]"
        className="w-auto max-w-[16rem]"
      />
    </ListFilterToolbar>
  );
}
