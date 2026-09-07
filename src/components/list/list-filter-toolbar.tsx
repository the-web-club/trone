"use client";

import { SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
  children?: React.ReactNode;
  moreFilters?: React.ReactNode;
  moreCount?: number;
  chips: ListFilterChip[];
  hasActiveFilters: boolean;
  onReset: () => void;
  isPending: boolean;
  statusMessage?: string;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="list-toolbar" aria-busy={isPending}>
      <FilterBar>
        <SearchInput
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={onSearchClear}
          placeholder={searchPlaceholder}
          aria-label={searchAriaLabel}
          autoComplete="off"
          containerClassName="w-full min-w-0 sm:w-60"
        />
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
        {isPending || statusMessage ? (
          <span className="text-xs text-fg-subtle" role="status">
            {isPending ? "Bijwerken…" : statusMessage}
          </span>
        ) : null}
        {hasActiveFilters ? (
          <Button type="button" variant="ghost" disabled={isPending} onClick={onReset}>
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
