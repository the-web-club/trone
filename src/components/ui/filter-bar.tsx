"use client";

import { Search, X } from "lucide-react";
import * as React from "react";
import {
  controlMotion,
  controlSize,
  fieldBase,
  focusRingOutline,
} from "@/components/ui/control-styles";
import { cn } from "@/lib/cn";

/**
 * Horizontal band that holds search, filter controls and trailing actions.
 * No card, border or background: spacing and control chrome carry the grouping.
 */
export function FilterBar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        "[&>[data-field-control]]:w-auto",
        className,
      )}
      {...props}
    />
  );
}

/** Pushes everything after it to the right edge of the bar. */
export function FilterBarSpacer() {
  return <div className="ml-auto" aria-hidden />;
}

export type SearchInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "size"
> & {
  onClear?: () => void;
  containerClassName?: string;
};

export function SearchInput({
  className,
  containerClassName,
  onClear,
  value,
  ...props
}: SearchInputProps) {
  const hasValue = typeof value === "string" && value.length > 0;

  return (
    <div className={cn("relative", containerClassName)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-subtle"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        data-field-control=""
        className={cn(
          "flex",
          fieldBase,
          controlSize.md,
          "pr-8 pl-8",
          "[&::-webkit-search-cancel-button]:hidden",
          className,
        )}
        {...props}
      />
      {hasValue && onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Zoekterm wissen"
          className={cn(
            "absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-xs text-fg-subtle sm:size-5",
            controlMotion,
            focusRingOutline,
            "hover:bg-hover hover:text-fg",
          )}
        >
          <X className="size-3" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

/** Active filter summary; removable and readable at a glance. */
export function FilterChip({
  label,
  value,
  onRemove,
  removeLabel,
}: {
  label: string;
  value: string;
  onRemove: () => void;
  removeLabel?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1 rounded-sm border border-border bg-surface pr-0.5 pl-2 text-xs text-fg",
        controlMotion,
      )}
    >
      <span className="text-fg-muted">{label}</span>
      <span className="min-w-0 truncate font-medium">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel ?? `${label}-filter verwijderen`}
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-xs text-fg-subtle sm:size-5",
          controlMotion,
          focusRingOutline,
          "hover:bg-hover hover:text-fg",
        )}
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  );
}

/** Small count on a "more filters" trigger. */
export function FilterCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] leading-none font-medium text-accent-fg tabular-nums">
      {count}
    </span>
  );
}
