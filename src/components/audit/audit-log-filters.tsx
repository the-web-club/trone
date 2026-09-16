"use client";

import { DateRangeFields } from "@/components/list/date-range-fields";
import {
  useListHrefReplace,
  useListNavigation,
} from "@/components/list/list-browser";
import {
  ListFilterToolbar,
  useDebouncedUrlSearch,
  type ListFilterChip,
} from "@/components/list/list-filter-toolbar";
import { MultiSelectMenu } from "@/components/ui/multi-select-menu";
import { SelectMenu, type SelectOption } from "@/components/ui/select";
import {
  AUDIT_ACTOR_SYSTEM,
  buildAuditFilterHref,
  type AuditFilterValues,
} from "@/lib/audit-query";
import type { AuditActorOption } from "@/lib/audit/query";
import {
  AUDIT_CATEGORIES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
  AUDIT_RESULTS,
  AUDIT_SEVERITIES,
  AUDIT_SOURCES,
  auditCategoryLabel,
  auditEntityTypeLabel,
  auditEventTypeLabel,
  auditResultLabel,
  auditSeverityLabel,
  auditSourceLabel,
} from "@/lib/audit/registry";

const ALL = "__alle__";

/**
 * Filters voor het audit-log.
 *
 * Zelfde opzet als de andere lijsten: alle filterstand staat in de URL, de
 * component schrijft alleen een nieuwe href. Daardoor is een gefilterde
 * logweergave te delen en te herladen, en resetten de filters de cursor.
 *
 * De opties komen uit de registry en niet uit een facetquery: een COUNT per
 * eventtype over een append-only log dat hard groeit is te duur voor wat het
 * oplevert.
 */
export function AuditLogFilters({
  values,
  actors,
  unknownActorLabel,
}: {
  values: AuditFilterValues;
  actors: AuditActorOption[];
  /** Naam uit de snapshot als het actorfilter een verwijderde gebruiker is. */
  unknownActorLabel?: string | null;
}) {
  const replace = useListHrefReplace();
  const { isPending } = useListNavigation();

  function navigate(next: Partial<AuditFilterValues>) {
    replace(buildAuditFilterHref({ ...values, ...next }));
  }

  const search = useDebouncedUrlSearch(
    values.zoeken,
    (zoeken) => navigate({ zoeken }),
    { delay: 250 },
  );

  const eventTypeItems: Array<SelectOption> = AUDIT_EVENT_TYPES.map((type) => ({
    value: type,
    label: auditEventTypeLabel(type),
  }));
  const categoryItems: Array<SelectOption> = AUDIT_CATEGORIES.map(
    (category) => ({
      value: category,
      label: auditCategoryLabel(category),
    }),
  );

  const actorItems: Array<SelectOption> = [
    { value: ALL, label: "Alle gebruikers" },
    { value: AUDIT_ACTOR_SYSTEM, label: "Systeem (geen gebruiker)" },
    ...actors.map((actor) => ({
      value: actor.id,
      label: actor.isActive
        ? actor.name || actor.email
        : `${actor.name || actor.email} (inactief)`,
    })),
    // Een filter op een verwijderde gebruiker mag niet stil uit de select
    // vallen; anders lijkt het filter uit te staan terwijl het aan staat.
    ...(values.gebruiker &&
    values.gebruiker !== AUDIT_ACTOR_SYSTEM &&
    !actors.some((actor) => actor.id === values.gebruiker)
      ? [
          {
            value: values.gebruiker,
            label: unknownActorLabel
              ? `${unknownActorLabel} (verwijderd)`
              : "Verwijderde gebruiker",
          },
        ]
      : []),
  ];

  const sourceItems: Array<SelectOption> = [
    { value: ALL, label: "Alle bronnen" },
    ...AUDIT_SOURCES.map((source) => ({
      value: source,
      label: auditSourceLabel(source),
    })),
  ];
  const resultItems: Array<SelectOption> = [
    { value: ALL, label: "Alle resultaten" },
    ...AUDIT_RESULTS.map((result) => ({
      value: result,
      label: auditResultLabel(result),
    })),
  ];
  const severityItems: Array<SelectOption> = [
    { value: ALL, label: "Alle ernst" },
    ...AUDIT_SEVERITIES.map((severity) => ({
      value: severity,
      label: auditSeverityLabel(severity),
    })),
  ];
  const entityItems: Array<SelectOption> = [
    { value: ALL, label: "Alle objecten" },
    ...AUDIT_ENTITY_TYPES.map((entity) => ({
      value: entity,
      label: auditEntityTypeLabel(entity),
    })),
  ];

  const actorLabel =
    values.gebruiker === AUDIT_ACTOR_SYSTEM
      ? "Systeem"
      : (actorItems.find((item) => item.value === values.gebruiker)?.label ??
        values.gebruiker);

  const chips: ListFilterChip[] = [
    values.type.length
      ? {
          key: "type",
          label: "Event",
          value: values.type.map(auditEventTypeLabel).join(", "),
          onRemove: () => navigate({ type: [] }),
        }
      : null,
    values.categorie.length
      ? {
          key: "categorie",
          label: "Categorie",
          value: values.categorie.map(auditCategoryLabel).join(", "),
          onRemove: () => navigate({ categorie: [] }),
        }
      : null,
    values.gebruiker
      ? {
          key: "gebruiker",
          label: "Gebruiker",
          value: actorLabel,
          onRemove: () => navigate({ gebruiker: "" }),
        }
      : null,
    values.actie
      ? {
          key: "actie",
          label: "Actie",
          value: values.actie,
          onRemove: () => navigate({ actie: "" }),
        }
      : null,
    values.bron
      ? {
          key: "bron",
          label: "Bron",
          value: auditSourceLabel(values.bron),
          onRemove: () => navigate({ bron: "" }),
        }
      : null,
    values.resultaat
      ? {
          key: "resultaat",
          label: "Resultaat",
          value: auditResultLabel(values.resultaat),
          onRemove: () => navigate({ resultaat: "" }),
        }
      : null,
    values.ernst
      ? {
          key: "ernst",
          label: "Ernst",
          value: auditSeverityLabel(values.ernst),
          onRemove: () => navigate({ ernst: "" }),
        }
      : null,
    values.entiteit
      ? {
          key: "entiteit",
          label: "Object",
          value: auditEntityTypeLabel(values.entiteit),
          onRemove: () => navigate({ entiteit: "" }),
        }
      : null,
    values.van || values.tot
      ? {
          key: "periode",
          label: "Periode",
          value: [values.van || "…", values.tot || "…"].join(" – "),
          onRemove: () => navigate({ van: "", tot: "" }),
        }
      : null,
  ].filter((chip): chip is ListFilterChip => chip !== null);

  return (
    <ListFilterToolbar
      searchValue={search.value}
      onSearchChange={search.onChange}
      onSearchClear={search.onClear}
      searchPlaceholder="Zoek op actie, route, object of gebruiker"
      searchAriaLabel="Zoek in logs"
      chips={chips}
      hasActiveFilters={chips.length > 0 || Boolean(values.zoeken)}
      onReset={() =>
        replace(
          buildAuditFilterHref({
            zoeken: "",
            type: [],
            categorie: [],
            gebruiker: "",
            actie: "",
            bron: "",
            resultaat: "",
            ernst: "",
            entiteit: "",
            van: "",
            tot: "",
          }),
        )
      }
      isPending={isPending}
      moreCount={
        [values.bron, values.resultaat, values.ernst, values.entiteit].filter(
          Boolean,
        ).length + (values.van || values.tot ? 1 : 0)
      }
      moreFilters={
        <div className="flex flex-col gap-3">
          <SelectMenu
            prefix="Bron"
            aria-label="Filter op bron"
            value={values.bron || ALL}
            onValueChange={(next) =>
              navigate({ bron: next === ALL ? "" : next })
            }
            items={sourceItems}
            className="w-full"
          />
          <SelectMenu
            prefix="Resultaat"
            aria-label="Filter op resultaat"
            value={values.resultaat || ALL}
            onValueChange={(next) =>
              navigate({ resultaat: next === ALL ? "" : next })
            }
            items={resultItems}
            className="w-full"
          />
          <SelectMenu
            prefix="Ernst"
            aria-label="Filter op ernst"
            value={values.ernst || ALL}
            onValueChange={(next) =>
              navigate({ ernst: next === ALL ? "" : next })
            }
            items={severityItems}
            className="w-full"
          />
          <SelectMenu
            prefix="Object"
            aria-label="Filter op soort object"
            value={values.entiteit || ALL}
            onValueChange={(next) =>
              navigate({ entiteit: next === ALL ? "" : next })
            }
            items={entityItems}
            className="w-full"
          />
          <DateRangeFields
            van={values.van}
            tot={values.tot}
            onVan={(van) => navigate({ van })}
            onTot={(tot) => navigate({ tot })}
          />
        </div>
      }
    >
      <MultiSelectMenu
        prefix="Event"
        aria-label="Filter op event type"
        values={values.type}
        onValuesChange={(type) => navigate({ type })}
        items={eventTypeItems}
        placeholder="Alle"
        className="w-full md:w-auto"
      />
      <MultiSelectMenu
        prefix="Categorie"
        aria-label="Filter op categorie"
        values={values.categorie}
        onValuesChange={(categorie) => navigate({ categorie })}
        items={categoryItems}
        placeholder="Alle"
        className="w-full md:w-auto"
      />
      <SelectMenu
        prefix="Gebruiker"
        aria-label="Filter op gebruiker"
        value={values.gebruiker || ALL}
        onValueChange={(next) =>
          navigate({ gebruiker: next === ALL ? "" : next })
        }
        items={actorItems}
        contentClassName="min-w-[16rem]"
        className="w-full max-w-none md:w-auto md:max-w-[16rem]"
      />
    </ListFilterToolbar>
  );
}
