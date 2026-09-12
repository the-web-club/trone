"use client";

import { SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FilterBar,
  FilterBarSpacer,
  FilterChip,
  FilterCountBadge,
  SearchInput,
} from "@/components/ui/filter-bar";
import {
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import {
  alphanumericLength,
  effectiveSearchQuery,
} from "@/lib/list-query";

export type ListFilterChip = {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
};

export function ListFilterToolbar({
  searchValue,
  onSearchChange,
  onSearchClear,
  searchPlaceholder,
  searchAriaLabel,
  children,
  moreFilters,
  moreCount = 0,
  chips,
  hasActiveFilters,
  onReset,
  isPending,
  statusMessage,
  toolbarStart,
  filterCount,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
  children?: ReactNode;
  moreFilters?: ReactNode;
  moreCount?: number;
  chips: ListFilterChip[];
  hasActiveFilters: boolean;
  onReset: () => void;
  isPending: boolean;
  statusMessage?: string;
  toolbarStart?: ReactNode;
  filterCount?: number;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const mobileFilterCount = filterCount ?? chips.length;
  const hasSheetFilters = Boolean(children || moreFilters);

  const searchField = (
    <SearchInput
      value={searchValue}
      onChange={(event) => onSearchChange(event.target.value)}
      onClear={onSearchClear}
      placeholder={searchPlaceholder}
      aria-label={searchAriaLabel}
      autoComplete="off"
      containerClassName="w-full min-w-0 md:w-60"
    />
  );

  const status = isPending || statusMessage ? (
    <span className="text-xs text-fg-subtle" role="status">
      {isPending ? "Bijwerken…" : statusMessage}
    </span>
  ) : null;

  return (
    <div className="list-toolbar" aria-busy={isPending}>
      <div className="flex flex-col gap-2 md:hidden">
        {searchField}
        {hasSheetFilters || toolbarStart ? (
          <div className="list-toolbar-actions">
            {toolbarStart}
            {hasSheetFilters ? (
              <Button
                type="button"
                variant="secondary"
                className={cn(mobileFilterCount > 0 && "border-border-strong")}
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal aria-hidden />
                Filters
                <FilterCountBadge count={mobileFilterCount} />
              </Button>
            ) : null}
          </div>
        ) : null}
        {status}
      </div>

      <FilterBar className="hidden md:flex">
        {searchField}
        {children}
        {moreFilters ? (
          <PopoverRoot open={moreOpen} onOpenChange={setMoreOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="secondary"
                  className={cn(moreCount > 0 && "border-border-strong")}
                />
              }
            >
              <SlidersHorizontal aria-hidden />
              Meer filters
              <FilterCountBadge count={moreCount} />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[19rem] p-3">
              {moreFilters}
            </PopoverContent>
          </PopoverRoot>
        ) : null}
        <FilterBarSpacer />
        {status}
        {hasActiveFilters ? (
          <Button type="button" variant="ghost" disabled={isPending} onClick={onReset}>
            Filters wissen
          </Button>
        ) : null}
      </FilterBar>

      {hasSheetFilters ? (
        <DialogRoot open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DialogContent size="md">
            <DialogHeader>
              <DialogTitle>Filters</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <div className="list-mobile-filters">
                {children}
                {moreFilters}
              </div>
            </DialogBody>
            <DialogFooter>
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={onReset}
                >
                  Wissen
                </Button>
              ) : null}
              <Button type="button" onClick={() => setFiltersOpen(false)}>
                Toon resultaten
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogRoot>
      ) : null}

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

export type DebouncedUrlSearchOptions = {
  delay?: number;
  minAlphanumeric?: number;
};

export function useDebouncedUrlSearch(
  valueFromUrl: string,
  commit: (value: string) => void,
  options: DebouncedUrlSearchOptions = {},
) {
  const delay = options.delay ?? 250;
  const minAlphanumeric = options.minAlphanumeric ?? 0;
  const [value, setValue] = useState(valueFromUrl);
  const [fromUrl, setFromUrl] = useState(valueFromUrl);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlRef = useRef(valueFromUrl);
  urlRef.current = valueFromUrl;

  if (valueFromUrl !== fromUrl) {
    setFromUrl(valueFromUrl);
    setValue(valueFromUrl);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function resolvedCommitValue(next: string) {
    if (minAlphanumeric <= 0) return next;
    return effectiveSearchQuery(next, minAlphanumeric);
  }

  function onChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (minAlphanumeric > 0) {
      if (next.trim() && alphanumericLength(next) < minAlphanumeric) {
        return;
      }
    }

    const committed = resolvedCommitValue(next);
    if (committed === urlRef.current) return;

    const reachedMin =
      minAlphanumeric > 0 && alphanumericLength(value) < minAlphanumeric;
    debounceRef.current = setTimeout(
      () => {
        if (committed === urlRef.current) return;
        commit(committed);
      },
      reachedMin ? 0 : delay,
    );
  }

  function onClear() {
    setValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (urlRef.current !== "") commit("");
  }

  return { value, onChange, onClear };
}
