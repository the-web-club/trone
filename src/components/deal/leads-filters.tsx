"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type TransitionStartFunction } from "react";
import { ListFilterToolbar } from "@/components/list/list-filter-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelectMenu } from "@/components/ui/multi-select-menu";
import { SelectMenu, type SelectOption } from "@/components/ui/select";
import { facetSelectOptions } from "@/components/filters/facet-select";
import {
  applicationFacetCatalog,
  industryFacetCatalog,
  sectorFacetCatalog,
} from "@/lib/filters/definitions";
import {
  applicationFilterLabel,
  industryFilterLabel,
  sectorFilterLabel,
} from "@/lib/classification";
import { formatDate, formatEuro } from "@/lib/format";
import type { DealFilterFacets, DealTeamMember } from "@/lib/deal-service";
import {
  LEAD_SCORE_FILTERS,
  leadScoreFilterLabel,
  type LeadScoreFilter,
} from "@/lib/lead-score";
import {
  buildDealsHref,
  type DealDateField,
  type DealSort,
  type DealStatusFilter,
  type DealsFilterValues,
  type DealsView,
} from "@/lib/deals-query";

const ALL = "__alle__";

function formatDateLabel(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return formatDate(date);
}

export function LeadsFilters({
  values,
  view,
  stages,
  sources,
  members,
  facets,
  isPending,
  startTransition,
}: {
  values: DealsFilterValues;
  view: DealsView;
  stages: Array<{ id: string; name: string }>;
  sources: Array<{ id: string; name: string }>;
  members: DealTeamMember[];
  facets: DealFilterFacets;
  isPending: boolean;
  startTransition: TransitionStartFunction;
}) {
  const router = useRouter();
  const [zoeken, setZoeken] = useState(values.zoeken);
  const [zoekenFromUrl, setZoekenFromUrl] = useState(values.zoeken);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideStageFilter = view === "kanban";

  const stageCount = facets.byStage.map((item) => ({
    value: item.stageId,
    count: item.count,
  }));
  const sourceCount = [
    { value: "geen", count: facets.unassignedSource },
    ...facets.bySource.map((item) => ({
      value: item.sourceId,
      count: item.count,
    })),
  ];
  const ownerCount = [
    { value: "niet-toegewezen", count: facets.unassignedOwner },
    { value: "aan-mij", count: facets.assignedToMe },
    ...facets.byOwner.map((item) => ({
      value: item.userId,
      count: item.count,
    })),
  ];
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

  if (values.zoeken !== zoekenFromUrl) {
    setZoekenFromUrl(values.zoeken);
    setZoeken(values.zoeken);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function navigate(next: Partial<typeof values>) {
    const href = buildDealsHref({
      zoeken: next.zoeken ?? zoeken,
      fase: hideStageFilter ? "" : (next.fase ?? values.fase),
      bron: next.bron ?? values.bron,
      eigenaar: next.eigenaar ?? values.eigenaar,
      status: next.status ?? values.status,
      waardeMin: next.waardeMin ?? values.waardeMin,
      waardeMax: next.waardeMax ?? values.waardeMax,
      van: next.van ?? values.van,
      tot: next.tot ?? values.tot,
      datumveld: next.datumveld ?? values.datumveld,
      sortering: next.sortering ?? values.sortering,
      leadscore: next.leadscore ?? values.leadscore,
      branche: next.branche ?? values.branche,
      sector: next.sector ?? values.sector,
      toepassing: next.toepassing ?? values.toepassing,
      pagina: 1,
      view,
    });

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  function onSearchChange(value: string) {
    setZoeken(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate({ zoeken: value });
    }, 250);
  }

  function onSearchClear() {
    setZoeken("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    navigate({ zoeken: "" });
  }

  const hasDateRange = Boolean(values.van || values.tot);
  const hasValueRange = Boolean(values.waardeMin || values.waardeMax);
  const secondaryCount = (hasDateRange ? 1 : 0) + (hasValueRange ? 1 : 0);

  const stageOptions: SelectOption[] = facetSelectOptions({
    catalog: stages.map((stage) => ({ value: stage.id, label: stage.name })),
    counts: stageCount,
    selected: values.fase,
    all: { value: ALL, label: "Alle fases", count: facets.stageTotal },
  });

  const sourceOptions: SelectOption[] = facetSelectOptions({
    catalog: [
      { value: "geen", label: "Geen bron" },
      ...sources.map((source) => ({ value: source.id, label: source.name })),
    ],
    counts: sourceCount,
    selected: values.bron,
    all: { value: ALL, label: "Alle bronnen", count: facets.sourceTotal },
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
    counts: ownerCount,
    selected: values.eigenaar === "alle" ? [] : [values.eigenaar],
    all: { value: "alle", label: "Alle", count: facets.ownerTotal },
  });

  const statusOptions: SelectOption<DealStatusFilter>[] = facetSelectOptions({
    catalog: [
      { value: "open", label: "Open" },
      { value: "won", label: "Gewonnen" },
      { value: "lost", label: "Verloren" },
    ],
    counts: [
      { value: "open", count: facets.byStatus.OPEN ?? 0 },
      { value: "won", count: facets.byStatus.WON ?? 0 },
      { value: "lost", count: facets.byStatus.LOST ?? 0 },
    ],
    selected: values.status === "alle" ? [] : [values.status],
    all: { value: "alle", label: "Alle", count: facets.statusTotal },
  });

  const sortOptions: SelectOption<DealSort>[] = [
    { value: "nieuwste", label: "Nieuwste" },
    { value: "oudste", label: "Oudste" },
    { value: "gewijzigd", label: "Gewijzigd" },
    { value: "leadscore", label: "Leadscore" },
  ];

  const scoreOptions: SelectOption<LeadScoreFilter | typeof ALL>[] =
    facetSelectOptions({
      catalog: LEAD_SCORE_FILTERS.map((filter) => ({
        value: filter,
        label: leadScoreFilterLabel(filter),
      })),
      counts: LEAD_SCORE_FILTERS.map((filter) => ({
        value: filter,
        count: facets.byScore[filter],
      })),
      selected: values.leadscore,
      all: { value: ALL, label: "Alle", count: facets.scoreTotal },
    });

  const dateFieldOptions: SelectOption<DealDateField>[] = [
    { value: "aangemaakt", label: "Aangemaakt" },
    { value: "verwacht", label: "Verwachte sluiting" },
  ];

  const ownerLabel =
    values.eigenaar === "alle"
      ? "Alle"
      : values.eigenaar === "niet-toegewezen"
        ? "Niet toegewezen"
        : values.eigenaar === "aan-mij"
          ? "Aan mij"
          : (memberLabel.get(values.eigenaar) ?? values.eigenaar);

  const chips: Array<{
    key: string;
    label: string;
    value: string;
    onRemove: () => void;
  }> = [];

  if (!hideStageFilter && values.fase) {
    chips.push({
      key: "fase",
      label: "Fase",
      value: stages.find((stage) => stage.id === values.fase)?.name ?? values.fase,
      onRemove: () => navigate({ fase: "" }),
    });
  }
  if (values.bron) {
    chips.push({
      key: "bron",
      label: "Bron",
      value:
        values.bron === "geen"
          ? "Geen bron"
          : (sources.find((source) => source.id === values.bron)?.name ?? values.bron),
      onRemove: () => navigate({ bron: "" }),
    });
  }
  if (values.eigenaar !== "alle") {
    chips.push({
      key: "eigenaar",
      label: "Eigenaar",
      value: ownerLabel,
      onRemove: () => navigate({ eigenaar: "alle" }),
    });
  }
  if (values.status !== "alle") {
    chips.push({
      key: "status",
      label: "Status",
      value:
        statusOptions.find((option) => option.value === values.status)?.label ??
        values.status,
      onRemove: () => navigate({ status: "alle" }),
    });
  }
  if (values.leadscore) {
    chips.push({
      key: "leadscore",
      label: "Leadscore",
      value: leadScoreFilterLabel(values.leadscore),
      onRemove: () => navigate({ leadscore: "" }),
    });
  }
  if ((values.branche ?? []).length > 0) {
    chips.push({
      key: "branche",
      label: "Branche",
      value: (values.branche ?? []).map(industryFilterLabel).join(", "),
      onRemove: () => navigate({ branche: [] }),
    });
  }
  if ((values.sector ?? []).length > 0) {
    chips.push({
      key: "sector",
      label: "Sector",
      value: (values.sector ?? []).map(sectorFilterLabel).join(", "),
      onRemove: () => navigate({ sector: [] }),
    });
  }
  if ((values.toepassing ?? []).length > 0) {
    chips.push({
      key: "toepassing",
      label: "Toepassing",
      value: (values.toepassing ?? []).map(applicationFilterLabel).join(", "),
      onRemove: () => navigate({ toepassing: [] }),
    });
  }
  if (hasValueRange) {
    const min = values.waardeMin ? formatEuro(Number(values.waardeMin)) : null;
    const max = values.waardeMax ? formatEuro(Number(values.waardeMax)) : null;
    chips.push({
      key: "waarde",
      label: "Waarde",
      value: min && max ? `${min} – ${max}` : min ? `vanaf ${min}` : `tot ${max}`,
      onRemove: () => navigate({ waardeMin: "", waardeMax: "" }),
    });
  }
  if (hasDateRange) {
    const fieldLabel =
      values.datumveld === "verwacht" ? "Verwachte sluiting" : "Aangemaakt";
    chips.push({
      key: "datum",
      label: fieldLabel,
      value: values.van
        ? values.tot
          ? `${formatDateLabel(values.van)} – ${formatDateLabel(values.tot)}`
          : `vanaf ${formatDateLabel(values.van)}`
        : `tot ${formatDateLabel(values.tot)}`,
      onRemove: () => navigate({ van: "", tot: "" }),
    });
  }
  if (values.sortering !== "nieuwste") {
    chips.push({
      key: "sortering",
      label: "Sortering",
      value:
        sortOptions.find((option) => option.value === values.sortering)?.label ??
        values.sortering,
      onRemove: () => navigate({ sortering: "nieuwste" }),
    });
  }

  const hasActiveFilters = chips.length > 0 || Boolean(values.zoeken);

  function resetAll() {
    setZoeken("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    startTransition(() => {
      router.replace(buildDealsHref({ view, pagina: 1 }), { scroll: false });
    });
  }

  const sourceValue = values.bron || ALL;

  return (
    <ListFilterToolbar
      searchValue={zoeken}
      onSearchChange={onSearchChange}
      onSearchClear={onSearchClear}
      searchPlaceholder="Titel, bedrijf of contact"
      searchAriaLabel="Zoek leads"
      chips={chips}
      moreCount={secondaryCount}
      moreFilters={
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-label font-medium text-fg-muted">Datumbereik</p>
            <SelectMenu<DealDateField>
              aria-label="Datumveld"
              value={values.datumveld}
              onValueChange={(next) => navigate({ datumveld: next })}
              items={dateFieldOptions}
              className="w-full"
            />
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                aria-label="Van"
                value={values.van}
                onChange={(event) => navigate({ van: event.target.value })}
                className="min-w-0 flex-1"
              />
              <span className="shrink-0 text-fg-subtle" aria-hidden>
                –
              </span>
              <Input
                type="date"
                aria-label="Tot"
                value={values.tot}
                onChange={(event) => navigate({ tot: event.target.value })}
                className="min-w-0 flex-1"
              />
            </div>
          </div>

          <div className="space-y-1.5 border-t border-border pt-3">
            <p className="text-label font-medium text-fg-muted">Waarde</p>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                step="1"
                inputMode="decimal"
                placeholder="Min"
                aria-label="Minimale waarde"
                defaultValue={values.waardeMin}
                onBlur={(event) =>
                  navigate({ waardeMin: event.target.value.trim() })
                }
                className="min-w-0 flex-1"
              />
              <span className="shrink-0 text-fg-subtle" aria-hidden>
                –
              </span>
              <Input
                type="number"
                min={0}
                step="1"
                inputMode="decimal"
                placeholder="Max"
                aria-label="Maximale waarde"
                defaultValue={values.waardeMax}
                onBlur={(event) =>
                  navigate({ waardeMax: event.target.value.trim() })
                }
                className="min-w-0 flex-1"
              />
            </div>
          </div>

          {secondaryCount > 0 ? (
            <div className="flex justify-end border-t border-border pt-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  navigate({
                    van: "",
                    tot: "",
                    waardeMin: "",
                    waardeMax: "",
                  })
                }
              >
                Wissen
              </Button>
            </div>
          ) : null}
        </div>
      }
      hasActiveFilters={hasActiveFilters}
      onReset={resetAll}
      isPending={isPending}
      statusMessage={
        facets.classificationStale
          ? "Tellingen tijdelijk niet beschikbaar"
          : undefined
      }
    >
      {hideStageFilter ? null : (
        <SelectMenu
          prefix="Fase"
          aria-label="Filter op fase"
          value={values.fase || ALL}
          onValueChange={(next) => navigate({ fase: next === ALL ? "" : next })}
          items={stageOptions}
          contentClassName="min-w-[14rem]"
          className="w-full md:w-auto"
        />
      )}

      <SelectMenu
        prefix="Bron"
        aria-label="Filter op bron"
        value={sourceValue}
        onValueChange={(next) =>
          navigate({ bron: next === ALL ? "" : next })
        }
        items={sourceOptions}
        contentClassName="min-w-[14rem]"
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

      <SelectMenu<DealStatusFilter>
        prefix="Status"
        aria-label="Filter op status"
        value={values.status}
        onValueChange={(next) => navigate({ status: next })}
        items={statusOptions}
        className="w-full md:w-auto"
      />

      <SelectMenu<LeadScoreFilter | typeof ALL>
        prefix="Leadscore"
        aria-label="Filter op leadscore"
        value={values.leadscore || ALL}
        onValueChange={(next) =>
          navigate({ leadscore: next === ALL ? "" : next })
        }
        items={scoreOptions}
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
        contentClassName="min-w-[16rem]"
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
        contentClassName="min-w-[16rem]"
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
        contentClassName="min-w-[16rem]"
        className="w-full md:w-auto"
      />

      <SelectMenu<DealSort>
        prefix="Sortering"
        aria-label="Sorteer leads"
        value={values.sortering}
        onValueChange={(next) => navigate({ sortering: next })}
        items={sortOptions}
        className="w-full md:w-auto"
      />
    </ListFilterToolbar>
  );
}
