"use client";

import {
  ListFilterToolbar,
  useDebouncedUrlSearch,
} from "@/components/list/list-filter-toolbar";
import { useListHrefReplace, useListNavigation } from "@/components/list/list-browser";
import { SelectMenu, type SelectOption } from "@/components/ui/select";
import { buildStaffHref, type StaffFilterValues } from "@/lib/staff-query";
import { staffStatuses, userRoleLabels, userRoles } from "@/lib/user-validation";

const ALL = "__alle__";

const statusLabels = {
  active: "Actief",
  invited: "Uitgenodigd",
  inactive: "Gedeactiveerd",
} as const;

export function StaffFilters({ values }: { values: StaffFilterValues }) {
  const replace = useListHrefReplace();
  const { isPending } = useListNavigation();

  function navigate(next: Partial<StaffFilterValues>) {
    replace(
      buildStaffHref({
        zoeken: next.zoeken ?? values.zoeken,
        rol: next.rol ?? values.rol,
        status: next.status ?? values.status,
        pagina: 1,
      }),
    );
  }

  const search = useDebouncedUrlSearch(values.zoeken, (zoeken) =>
    navigate({ zoeken }),
  );

  const roleOptions: SelectOption[] = [
    { value: ALL, label: "Alle rollen" },
    ...userRoles.map((role) => ({ value: role, label: userRoleLabels[role] })),
  ];
  const statusOptions: SelectOption[] = [
    { value: ALL, label: "Alle statussen" },
    ...staffStatuses.map((status) => ({
      value: status,
      label: statusLabels[status],
    })),
  ];

  const chips = [
    values.rol
      ? {
          key: "rol",
          label: "Rol",
          value: userRoleLabels[values.rol as keyof typeof userRoleLabels] ?? values.rol,
          onRemove: () => navigate({ rol: "" }),
        }
      : null,
    values.status
      ? {
          key: "status",
          label: "Status",
          value: statusLabels[values.status as keyof typeof statusLabels] ?? values.status,
          onRemove: () => navigate({ status: "" }),
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
      searchPlaceholder="Zoek op naam of e-mail"
      searchAriaLabel="Zoek medewerkers"
      chips={chips}
      hasActiveFilters={Boolean(values.zoeken || values.rol || values.status)}
      onReset={() =>
        replace(buildStaffHref({ zoeken: "", rol: "", status: "", pagina: 1 }))
      }
      isPending={isPending}
    >
      <SelectMenu
        prefix="Rol"
        aria-label="Filter op rol"
        value={values.rol || ALL}
        onValueChange={(next) => navigate({ rol: next === ALL ? "" : next })}
        items={roleOptions}
        className="w-auto"
      />
      <SelectMenu
        prefix="Status"
        aria-label="Filter op status"
        value={values.status || ALL}
        onValueChange={(next) => navigate({ status: next === ALL ? "" : next })}
        items={statusOptions}
        className="w-auto"
      />
    </ListFilterToolbar>
  );
}
