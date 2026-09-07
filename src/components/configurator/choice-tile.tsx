"use client";

import { Children, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Pressable } from "@/components/motion";
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
  const aria = [
    label,
    description,
    priceLabel,
    selected ? "geselecteerd" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable disabled={disabled} className="flex h-full w-full">
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={aria}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex h-full min-h-12 w-full items-start gap-2 rounded-md border px-3 py-2.5 text-left",
        controlMotion,
        focusRingOutline,
        selected
          ? "border-accent bg-selected-bg shadow-[inset_0_0_0_1px_var(--accent)]"
          : "border-border bg-surface hover:border-border-strong hover:bg-hover-subtle",
        "disabled:pointer-events-none disabled:opacity-45",
        className,
      )}
    >
      <span className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium break-words text-fg">{label}</span>
          {description ? (
            <span className="text-label break-words text-fg-muted">{description}</span>
          ) : null}
        </span>
        {priceLabel ? (
          <span className="shrink-0 whitespace-nowrap text-label text-fg-muted">
            {priceLabel}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center text-fg",
          !selected && "opacity-0",
        )}
      >
        <Check className="size-3.5" strokeWidth={2.4} />
      </span>
    </button>
    </Pressable>
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
  const count = Children.count(children);
  const cols = count <= 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid auto-rows-fr gap-2", cols, className)}
    >
      {Children.map(children, (child) => (
        <div className="flex min-w-0 [&>*]:flex-1">{child}</div>
      ))}
    </div>
  );
}
