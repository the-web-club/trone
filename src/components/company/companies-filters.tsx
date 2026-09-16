"use client";

import {
  ListFilterToolbar,
  useDebouncedUrlSearch,
} from "@/components/list/list-filter-toolbar";
import { useListHrefReplace, useListNavigation } from "@/components/list/list-browser";
import { SelectMenu, type SelectOption } from "@/components/ui/select";
import { MultiSelectMenu } from "@/components/ui/multi-select-menu";
import { facetSelectOptions } from "@/components/filters/facet-select";
import {
  applicationFacetCatalog,
  industryFacetCatalog,
  sectorFacetCatalog,
} from "@/lib/filters/definitions";
import {
  CLASSIFICATION_FILTER_UNKNOWN,
  applicationFilterLabel,
  industryFilterLabel,
  sectorFilterLabel,
} from "@/lib/classification";
import {
  buildCompaniesHref,
  companyLeadsFilterLabel,
  parseCompanyLeadsFilter,
  type CompaniesFilterValues,
  type CompanyLeadFacets,
} from "@/lib/companies-query";
import type { CompanyFilterFacets } from "@/lib/company-service";
import type { DealTeamMember } from "@/lib/deal-service";
import { countryLabel } from "@/lib/list-copy";

const ALL = "__alle__";

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
  facets: CompanyFilterFacets;
}) {
  const replace = useListHrefReplace();
  const { isPending } = useListNavigation();

  function navigate(next: Partial<CompaniesFilterValues>) {
    replace(buildCompaniesHref({ ...values, ...next, pagina: 1 }));
  }

  const search = useDebouncedUrlSearch(values.zoeken, (zoeken) =>
    navigate({ zoeken }),
  );

  const memberLabel = new Map(
    members.map((member) => [member.id, member.name || member.email]),
  );
  const classificationCounts = facets.classificationStale
    ? null
    : {
        industry: facets.byIndustry,
        sector: facets.bySector,
        application: facets.byApplication,
      };
  const leadFacets: CompanyLeadFacets = facets.leads;

  const cityOptions: SelectOption[] = facetSelectOptions({
    catalog: [
      { value: CLASSIFICATION_FILTER_UNKNOWN, label: "Plaats onbekend" },
      ...cities.map((city) => ({ value: city, label: city })),
    ],
    counts: [
      { value: CLASSIFICATION_FILTER_UNKNOWN, count: facets.unassignedCity },
      ...facets.byCity,
    ],
    selected: values.plaats,
    all: { value: ALL, label: "Alle plaatsen", count: facets.cityTotal },
  });
  const countryOptions: SelectOption[] = facetSelectOptions({
    catalog: countries.map((country) => ({
      value: country,
      label: countryLabel(country),
    })),
    counts: facets.byCountry,
    selected: values.land,
    all: { value: ALL, label: "Alle landen", count: facets.countryTotal },
  });
  const ownerOptions: SelectOption[] = facetSelectOptions({
    catalog: [
      { value: "niet-toegewezen", label: "Niet toegewezen" },
      { value: "aan-mij", label: "Aan mij" },
      ...members.map((member) => ({
        value: member.id,
        label: member.name || member.email,
        image: member.image,
      })),
    ],
    counts: [
      { value: "niet-toegewezen", count: facets.unassignedOwner },
      { value: "aan-mij", count: facets.assignedToMe },
      ...facets.byOwner.map((item) => ({
        value: item.userId,
        count: item.count,
      })),
    ],
    selected: values.eigenaar === "alle" ? [] : [values.eigenaar],
    all: { value: "alle", label: "Alle", count: facets.ownerTotal },
  });
  const leadOptions: SelectOption[] = facetSelectOptions({
    catalog: [
      { value: "geen", label: "Geen leads" },
      { value: "1", label: "1 lead" },
      { value: "2", label: "2 leads" },
      { value: "3", label: "3 leads" },
      { value: "4", label: "4 leads" },
      { value: "5plus", label: "5 of meer" },
    ],
    counts: [
      { value: "geen", count: leadFacets.none },
      { value: "1", count: leadFacets.byCount["1"] },
      { value: "2", count: leadFacets.byCount["2"] },
      { value: "3", count: leadFacets.byCount["3"] },
      { value: "4", count: leadFacets.byCount["4"] },
      { value: "5plus", count: leadFacets.byCount["5plus"] },
    ],
    selected: values.leads === "alle" ? [] : [values.leads],
    all: { value: "alle", label: "Alle", count: leadFacets.total },
  });

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
          value:
            values.plaats === CLASSIFICATION_FILTER_UNKNOWN
              ? "Plaats onbekend"
              : values.plaats,
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
    values.branche?.length
      ? {
          key: "branche",
          label: "Branche",
          value: (values.branche ?? []).map(industryFilterLabel).join(", "),
          onRemove: () => navigate({ branche: [] }),
        }
      : null,
    values.sector?.length
      ? {
          key: "sector",
          label: "Sector",
          value: (values.sector ?? []).map(sectorFilterLabel).join(", "),
          onRemove: () => navigate({ sector: [] }),
        }
      : null,
    values.toepassing?.length
      ? {
          key: "toepassing",
          label: "Toepassing",
          value: (values.toepassing ?? []).map(applicationFilterLabel).join(", "),
          onRemove: () => navigate({ toepassing: [] }),
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
          values.leads !== "alle" ||
          values.branche?.length ||
          values.sector?.length ||
          values.toepassing?.length,
      )}
      onReset={() =>
        replace(
          buildCompaniesHref({
            zoeken: "",
            plaats: "",
            land: "",
            eigenaar: "alle",
            leads: "alle",
            branche: [],
            sector: [],
            toepassing: [],
            pagina: 1,
          }),
        )
      }
      isPending={isPending}
      statusMessage={
        facets.classificationStale
          ? "Tellingen tijdelijk niet beschikbaar"
          : undefined
      }
    >
      <SelectMenu
        prefix="Plaats"
        aria-label="Filter op plaats"
        value={values.plaats || ALL}
        onValueChange={(next) => navigate({ plaats: next === ALL ? "" : next })}
        items={cityOptions}
        className="w-full md:w-auto"
      />
      <SelectMenu
        prefix="Land"
        aria-label="Filter op land"
        value={values.land || ALL}
        onValueChange={(next) => navigate({ land: next === ALL ? "" : next })}
        items={countryOptions}
        className="w-full md:w-auto"
      />
      <SelectMenu
        prefix="Eigenaar"
        aria-label="Filter op eigenaar"
        value={values.eigenaar}
        onValueChange={(next) => navigate({ eigenaar: next })}
        items={ownerOptions}
        contentClassName="min-w-[16rem]"
        className="w-full max-w-none md:w-auto md:max-w-[16rem]"
      />
      <SelectMenu
        prefix="Leads"
        aria-label="Filter op aantal leads"
        value={values.leads}
        onValueChange={(next) =>
          navigate({ leads: parseCompanyLeadsFilter(next) })
        }
        items={leadOptions}
        className="w-full md:w-auto"
      />
      <MultiSelectMenu
        prefix="Branche"
        aria-label="Filter op hoofdbranche"
        values={values.branche ?? []}
        onValuesChange={(branche) => navigate({ branche })}
        items={facetSelectOptions({
          catalog: industryFacetCatalog(),
          counts: classificationCounts?.industry ?? null,
          selected: values.branche ?? [],
        })}
        placeholder="Alle"
        className="w-full md:w-auto"
      />
      <MultiSelectMenu
        prefix="Sector"
        aria-label="Filter op sector"
        values={values.sector ?? []}
        onValuesChange={(sector) => navigate({ sector })}
        items={facetSelectOptions({
          catalog: sectorFacetCatalog(),
          counts: classificationCounts?.sector ?? null,
          selected: values.sector ?? [],
        })}
        placeholder="Alle"
        className="w-full md:w-auto"
      />
      <MultiSelectMenu
        prefix="Toepassing"
        aria-label="Filter op toepassing"
        values={values.toepassing ?? []}
        onValuesChange={(toepassing) => navigate({ toepassing })}
        items={facetSelectOptions({
          catalog: applicationFacetCatalog(),
          counts: classificationCounts?.application ?? null,
          selected: values.toepassing ?? [],
        })}
        placeholder="Alle"
        className="w-full md:w-auto"
      />
    </ListFilterToolbar>
  );
}
