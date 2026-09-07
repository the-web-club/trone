"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type TransitionStartFunction } from "react";
import { Button } from "@/components/ui/button";
import {
  FilterBar,
  FilterBarSpacer,
  FilterChip,
  FilterCountBadge,
  SearchInput,
} from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import {
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SelectMenu, type SelectOption } from "@/components/ui/select";
import { formatDate, formatEuro } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { DealFilterFacets, DealTeamMember } from "@/lib/deal-service";
import {
  buildDealsHref,
  type DealDateField,
  type DealSort,
  type DealStatusFilter,
  type DealsFilterValues,
  type DealsView,
} from "@/lib/deals-query";

const ALL = "__alle__";

function count(value: number | undefined): string {
  return String(typeof value === "number" ? value : 0);
}

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
  const [moreOpen, setMoreOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideStageFilter = view === "kanban";

  const stageCount = new Map(facets.byStage.map((item) => [item.stageId, item.count]));
  const sourceCount = new Map(facets.bySource.map((item) => [item.sourceId, item.count]));
  const ownerCount = new Map(facets.byOwner.map((item) => [item.userId, item.count]));
  const memberLabel = new Map(
    members.map((member) => [member.id, member.name || member.email]),
  );

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

  const stageOptions: SelectOption[] = [
    { value: ALL, label: "Alle fases", hint: count(facets.stageTotal) },
    ...stages.map((stage) => ({
      value: stage.id,
      label: stage.name,
      hint: count(stageCount.get(stage.id)),
    })),
  ];

  const sourceOptions: SelectOption[] = [
    { value: ALL, label: "Alle bronnen", hint: count(facets.sourceTotal) },
    { value: "geen", label: "Geen bron", hint: count(facets.unassignedSource) },
    ...sources.map((source) => ({
      value: source.id,
      label: source.name,
      hint: count(sourceCount.get(source.id)),
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

  const statusOptions: SelectOption<DealStatusFilter>[] = [
    { value: "alle", label: "Alle", hint: count(facets.statusTotal) },
    { value: "open", label: "Open", hint: count(facets.byStatus.OPEN) },
    { value: "won", label: "Gewonnen", hint: count(facets.byStatus.WON) },
    { value: "lost", label: "Verloren", hint: count(facets.byStatus.LOST) },
  ];

  const sortOptions: SelectOption<DealSort>[] = [
    { value: "nieuwste", label: "Nieuwste" },
    { value: "oudste", label: "Oudste" },
    { value: "gewijzigd", label: "Gewijzigd" },
  ];

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

  const hasActiveFilters =
    chips.length > 0 ||
    Boolean(values.zoeken) ||
    values.sortering !== "nieuwste";

  function resetAll() {
    setZoeken("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    startTransition(() => {
      router.replace(buildDealsHref({ view, pagina: 1 }), { scroll: false });
    });
  }

  const sourceValue = values.bron || ALL;

  return (
    <div className="list-toolbar" aria-busy={isPending}>
      <FilterBar>
        <SearchInput
          name="zoeken"
          value={zoeken}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={onSearchClear}
          placeholder="Titel, bedrijf of contact"
          aria-label="Zoek leads"
          autoComplete="off"
          containerClassName="w-full min-w-0 sm:w-60"
        />

        {hideStageFilter ? null : (
          <SelectMenu
            prefix="Fase"
            aria-label="Filter op fase"
            value={values.fase || ALL}
            onValueChange={(next) => navigate({ fase: next === ALL ? "" : next })}
            items={stageOptions}
            contentClassName="min-w-[14rem]"
            className="w-auto"
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

        <SelectMenu<DealStatusFilter>
          prefix="Status"
          aria-label="Filter op status"
          value={values.status}
          onValueChange={(next) => navigate({ status: next })}
          items={statusOptions}
          className="w-auto"
        />

        <SelectMenu<DealSort>
          prefix="Sortering"
          aria-label="Sorteer leads"
          value={values.sortering}
          onValueChange={(next) => navigate({ sortering: next })}
          items={sortOptions}
          className="w-auto"
        />

        <PopoverRoot open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="secondary"
                className={cn(secondaryCount > 0 && "border-border-strong")}
              />
            }
          >
            <SlidersHorizontal aria-hidden />
            Meer filters
            <FilterCountBadge count={secondaryCount} />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[19rem] p-3">
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
          </PopoverContent>
        </PopoverRoot>

        <FilterBarSpacer />

        {isPending ? (
          <span className="text-xs text-fg-subtle" role="status">
            Bijwerken…
          </span>
        ) : null}

        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={resetAll}
          >
            Filters wissen
          </Button>
        ) : null}
      </FilterBar>

      {chips.length > 0 ? (
        <div className="list-toolbar-chips">
          {chips.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              value={chip.value}
              onRemove={chip.onRemove}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
