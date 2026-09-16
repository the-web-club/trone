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
  CLASSIFICATION_FILTER_NO_COMPANY,
  applicationFilterLabel,
  industryFilterLabel,
  sectorFilterLabel,
} from "@/lib/classification";
import { buildContactsHref, type ContactsFilterValues } from "@/lib/contacts-query";
import type { ContactFilterFacets } from "@/lib/contact-service";
import type { DealTeamMember } from "@/lib/deal-service";
import {
  alphanumericLength,
  LIST_SEARCH_MIN_ALPHANUMERIC,
} from "@/lib/list-query";

const ALL = "__alle__";

export function ContactsFilters({
  values,
  companies,
  members,
  facets,
}: {
  values: ContactsFilterValues;
  companies: Array<{ id: string; name: string }>;
  members: DealTeamMember[];
  facets: ContactFilterFacets;
}) {
  const replace = useListHrefReplace();
  const { isPending } = useListNavigation();

  function navigate(next: Partial<ContactsFilterValues>) {
    replace(
      buildContactsHref({
        zoeken: next.zoeken ?? values.zoeken,
        bedrijf: next.bedrijf ?? values.bedrijf,
        eigenaar: next.eigenaar ?? values.eigenaar,
        branche: next.branche ?? values.branche,
        sector: next.sector ?? values.sector,
        toepassing: next.toepassing ?? values.toepassing,
        pagina: 1,
      }),
    );
  }

  const search = useDebouncedUrlSearch(
    values.zoeken,
    (zoeken) => navigate({ zoeken }),
    { delay: 150, minAlphanumeric: LIST_SEARCH_MIN_ALPHANUMERIC },
  );
  const typedAlphanumeric = alphanumericLength(search.value);
  const searchHint =
    typedAlphanumeric > 0 && typedAlphanumeric < LIST_SEARCH_MIN_ALPHANUMERIC
      ? "Typ minstens 3 letters of cijfers"
      : facets.classificationStale
        ? "Tellingen tijdelijk niet beschikbaar"
        : undefined;

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

  const companyOptions: SelectOption[] = facetSelectOptions({
    catalog: [
      { value: CLASSIFICATION_FILTER_NO_COMPANY, label: "Geen bedrijf" },
      ...companies.map((company) => ({ value: company.id, label: company.name })),
    ],
    counts: [
      {
        value: CLASSIFICATION_FILTER_NO_COMPANY,
        count: facets.unassignedCompany,
      },
      ...facets.byCompany,
    ],
    selected: values.bedrijf,
    all: { value: ALL, label: "Alle bedrijven", count: facets.companyTotal },
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

  const ownerLabel =
    values.eigenaar === "alle"
      ? "Alle"
      : values.eigenaar === "niet-toegewezen"
        ? "Niet toegewezen"
        : values.eigenaar === "aan-mij"
          ? "Aan mij"
          : (memberLabel.get(values.eigenaar) ?? values.eigenaar);

  const chips = [
    values.bedrijf
      ? {
          key: "bedrijf",
          label: "Bedrijf",
          value:
            values.bedrijf === CLASSIFICATION_FILTER_NO_COMPANY
              ? "Geen bedrijf"
              : (companies.find((company) => company.id === values.bedrijf)
                  ?.name ?? values.bedrijf),
          onRemove: () => navigate({ bedrijf: "" }),
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
      searchPlaceholder="Zoek op naam of e-mail (min. 3 tekens)"
      searchAriaLabel="Zoek contacten"
      chips={chips}
      hasActiveFilters={Boolean(
        values.zoeken ||
          values.bedrijf ||
          values.eigenaar !== "alle" ||
          values.branche?.length ||
          values.sector?.length ||
          values.toepassing?.length,
      )}
      statusMessage={searchHint}
      onReset={() =>
        replace(
          buildContactsHref({
            zoeken: "",
            bedrijf: "",
            eigenaar: "alle",
            branche: [],
            sector: [],
            toepassing: [],
            pagina: 1,
          }),
        )
      }
      isPending={isPending}
    >
      <SelectMenu
        prefix="Bedrijf"
        aria-label="Filter op bedrijf"
        value={values.bedrijf || ALL}
        onValueChange={(next) => navigate({ bedrijf: next === ALL ? "" : next })}
        items={companyOptions}
        contentClassName="min-w-[14rem]"
        className="w-full max-w-none md:w-auto md:max-w-[16rem]"
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
      <MultiSelectMenu
        prefix="Branche"
        aria-label="Filter op hoofdbranche"
        values={values.branche ?? []}
        onValuesChange={(branche) => navigate({ branche })}
        items={facetSelectOptions({
          catalog: industryFacetCatalog({ includeNoCompany: true }),
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
