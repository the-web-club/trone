"use client";

import {
  ListFilterToolbar,
  useDebouncedUrlSearch,
} from "@/components/list/list-filter-toolbar";
import { useListHrefReplace, useListNavigation } from "@/components/list/list-browser";
import { SelectMenu, type SelectOption } from "@/components/ui/select";
import {
  buildCompaniesHref,
  companyLeadsFilterLabel,
  parseCompanyLeadsFilter,
  type CompaniesFilterValues,
  type CompanyLeadFacets,
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
  leadFacets,
}: {
  values: CompaniesFilterValues;
  cities: string[];
  countries: string[];
  members: DealTeamMember[];
  facets: CompanyOwnerFacets;
  leadFacets: CompanyLeadFacets;
}) {
  const replace = useListHrefReplace();
  const { isPending } = useListNavigation();

  function navigate(next: Partial<CompaniesFilterValues>) {
    replace(buildCompaniesHref({ ...values, ...next, pagina: 1 }));
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
  const leadOptions: SelectOption[] = [
    { value: "alle", label: "Alle", hint: count(leadFacets.total) },
    { value: "geen", label: "Geen leads", hint: count(leadFacets.none) },
    { value: "1", label: "1 lead", hint: count(leadFacets.byCount["1"]) },
    { value: "2", label: "2 leads", hint: count(leadFacets.byCount["2"]) },
    { value: "3", label: "3 leads", hint: count(leadFacets.byCount["3"]) },
    { value: "4", label: "4 leads", hint: count(leadFacets.byCount["4"]) },
    {
      value: "5plus",
      label: "5 of meer",
      hint: count(leadFacets.byCount["5plus"]),
    },
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
    values.leads !== "alle"
      ? {
          key: "leads",
          label: "Leads",
          value: companyLeadsFilterLabel(values.leads),
          onRemove: () => navigate({ leads: "alle" }),
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
        values.zoeken ||
          values.plaats ||
          values.land ||
          values.eigenaar !== "alle" ||
          values.leads !== "alle",
      )}
      onReset={() =>
        replace(
          buildCompaniesHref({
            zoeken: "",
            plaats: "",
            land: "",
            eigenaar: "alle",
            leads: "alle",
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
      <SelectMenu
        prefix="Leads"
        aria-label="Filter op aantal leads"
        value={values.leads}
        onValueChange={(next) =>
          navigate({ leads: parseCompanyLeadsFilter(next) })
        }
        items={leadOptions}
        className="w-auto"
      />
    </ListFilterToolbar>
  );
}
