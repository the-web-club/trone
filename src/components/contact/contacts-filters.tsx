"use client";

import {
  ListFilterToolbar,
  useDebouncedUrlSearch,
} from "@/components/list/list-filter-toolbar";
import { useListHrefReplace, useListNavigation } from "@/components/list/list-browser";
import { SelectMenu, type SelectOption } from "@/components/ui/select";
import {
  buildContactsHref,
  type ContactsFilterValues,
} from "@/lib/contacts-query";

const ALL = "__alle__";

export function ContactsFilters({
  values,
  companies,
}: {
  values: ContactsFilterValues;
  companies: Array<{ id: string; name: string }>;
}) {
  const replace = useListHrefReplace();
  const { isPending } = useListNavigation();

  function navigate(next: Partial<ContactsFilterValues>) {
    replace(
      buildContactsHref({
        zoeken: next.zoeken ?? values.zoeken,
        bedrijf: next.bedrijf ?? values.bedrijf,
        pagina: 1,
      }),
    );
  }

  const search = useDebouncedUrlSearch(values.zoeken, (zoeken) =>
    navigate({ zoeken }),
  );

  const companyOptions: SelectOption[] = [
    { value: ALL, label: "Alle bedrijven" },
    ...companies.map((company) => ({ value: company.id, label: company.name })),
  ];

  const chips = values.bedrijf
    ? [
        {
          key: "bedrijf",
          label: "Bedrijf",
          value:
            companies.find((company) => company.id === values.bedrijf)?.name ??
            values.bedrijf,
          onRemove: () => navigate({ bedrijf: "" }),
        },
      ]
    : [];

  return (
    <ListFilterToolbar
      searchValue={search.value}
      onSearchChange={search.onChange}
      onSearchClear={search.onClear}
      searchPlaceholder="Zoek op naam of e-mail"
      searchAriaLabel="Zoek contacten"
      chips={chips}
      hasActiveFilters={Boolean(values.zoeken || values.bedrijf)}
      onReset={() => replace(buildContactsHref({ zoeken: "", bedrijf: "", pagina: 1 }))}
      isPending={isPending}
    >
      <SelectMenu
        prefix="Bedrijf"
        aria-label="Filter op bedrijf"
        value={values.bedrijf || ALL}
        onValueChange={(next) => navigate({ bedrijf: next === ALL ? "" : next })}
        items={companyOptions}
        contentClassName="min-w-[14rem]"
        className="w-auto max-w-[16rem]"
      />
    </ListFilterToolbar>
  );
}
