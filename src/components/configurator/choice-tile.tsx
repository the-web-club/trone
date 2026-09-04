"use client";

import type { ReactNode } from "react";
import { controlMotion, focusRingOutline } from "@/components/ui/control-styles";
import { cn } from "@/lib/cn";

export function ChoiceTile({
  selected,
  disabled,
  label,
  description,
  priceLabel,
  onSelect,
  className,
}: {
  selected: boolean;
  disabled?: boolean;
  label: string;
  description?: string;
  priceLabel?: string | null;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex min-h-12 w-full items-start justify-between gap-3 rounded-md px-3.5 py-3 text-left",
        controlMotion,
        focusRingOutline,
        selected
          ? "bg-selected-bg shadow-[inset_0_0_0_1px_var(--accent)]"
          : "bg-transparent shadow-[inset_0_0_0_1px_transparent] hover:bg-hover-subtle",
        "disabled:pointer-events-none disabled:opacity-45",
        className,
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium text-fg">{label}</span>
        {description ? (
          <span className="text-label text-fg-muted">{description}</span>
        ) : null}
      </span>
      {priceLabel ? (
        <span className="shrink-0 pt-0.5 text-label text-fg-muted">{priceLabel}</span>
      ) : null}
    </button>
  );
}

export function ChoiceTileGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid grid-cols-1 gap-1.5 sm:grid-cols-2", className)}
    >
      {children}
    </div>
  );
}
