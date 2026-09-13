"use client";

import {
  ListFilterToolbar,
  useDebouncedUrlSearch,
} from "@/components/list/list-filter-toolbar";
import { useListHrefReplace, useListNavigation } from "@/components/list/list-browser";
import { SelectMenu, type SelectOption } from "@/components/ui/select";
import {
  buildContactsHref,
  type ContactOwnerFacets,
  type ContactsFilterValues,
} from "@/lib/contacts-query";
import type { DealTeamMember } from "@/lib/deal-service";
import {
  alphanumericLength,
  LIST_SEARCH_MIN_ALPHANUMERIC,
} from "@/lib/list-query";

const ALL = "__alle__";

function count(value: number | undefined): string {
  return String(typeof value === "number" ? value : 0);
}

export function ContactsFilters({
  values,
  companies,
  members,
  facets,
}: {
  values: ContactsFilterValues;
  companies: Array<{ id: string; name: string }>;
  members: DealTeamMember[];
  facets: ContactOwnerFacets;
}) {
  const replace = useListHrefReplace();
  const { isPending } = useListNavigation();

  function navigate(next: Partial<ContactsFilterValues>) {
    replace(
      buildContactsHref({
        zoeken: next.zoeken ?? values.zoeken,
        bedrijf: next.bedrijf ?? values.bedrijf,
        eigenaar: next.eigenaar ?? values.eigenaar,
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
      : undefined;

  const ownerCount = new Map(facets.byOwner.map((item) => [item.userId, item.count]));
  const memberLabel = new Map(
    members.map((member) => [member.id, member.name || member.email]),
  );

  const companyOptions: SelectOption[] = [
    { value: ALL, label: "Alle bedrijven" },
    ...companies.map((company) => ({ value: company.id, label: company.name })),
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
    values.bedrijf
      ? {
          key: "bedrijf",
          label: "Bedrijf",
          value:
            companies.find((company) => company.id === values.bedrijf)?.name ??
            values.bedrijf,
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
        values.zoeken || values.bedrijf || values.eigenaar !== "alle",
      )}
      statusMessage={searchHint}
      onReset={() =>
        replace(
          buildContactsHref({
            zoeken: "",
            bedrijf: "",
            eigenaar: "alle",
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
    </ListFilterToolbar>
  );
}
