"use client";

import { Children, type ReactNode } from "react";
import { Check } from "lucide-react";
import { controlMotion, focusRingOutline } from "@/components/ui/control-styles";
import { cn } from "@/lib/cn";

export function ChoiceTile({
  selected,
  disabled,
  label,
  description,
  priceLabel,
  imageSrc,
  onSelect,
  className,
}: {
  selected: boolean;
  disabled?: boolean;
  label: string;
  description?: string;
  priceLabel?: string | null;
  imageSrc?: string;
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
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={aria}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex h-full min-h-12 w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left",
        controlMotion,
        focusRingOutline,
        selected
          ? "border-accent bg-selected-bg shadow-[inset_0_0_0_1px_var(--accent)]"
          : "border-border bg-surface hover:border-border-strong hover:bg-hover-subtle",
        "disabled:pointer-events-none disabled:opacity-45",
        className,
      )}
    >
      {imageSrc ? (
        <span className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-surface-sunk">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt="" className="size-full object-cover" />
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-fg">{label}</span>
        {description ? (
          <span className="text-label text-fg-muted">{description}</span>
        ) : null}
      </span>
      {priceLabel ? (
        <span className="shrink-0 text-label text-fg-muted">{priceLabel}</span>
      ) : null}
      <span
        aria-hidden
        className={cn(
          "flex size-4 shrink-0 items-center justify-center text-fg",
          !selected && "opacity-0",
        )}
      >
        <Check className="size-3.5" strokeWidth={2.4} />
      </span>
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
  const count = Children.count(children);
  const cols =
    count <= 1
      ? "grid-cols-1"
      : count === 3
        ? "grid-cols-3"
        : "grid-cols-2";

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
