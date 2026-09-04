"use client";

import { Check } from "lucide-react";
import { Pressable } from "@/components/motion";
import { controlMotion, focusRingOutline } from "@/components/ui/control-styles";
import { OP_AANVRAAG_HINT } from "@/components/configurator/price-copy";
import { cn } from "@/lib/cn";

export function OptionToggle({
  name,
  checked,
  priceLabel,
  onRequest,
  imageSrc,
  onChange,
}: {
  name: string;
  checked: boolean;
  priceLabel?: string | null;
  onRequest?: boolean;
  imageSrc?: string;
  onChange: (next: boolean) => void;
}) {
  const aria = [name, priceLabel, checked ? "aan" : "uit"]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable className="w-full">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={aria}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left",
        controlMotion,
        focusRingOutline,
        checked
          ? "border-accent bg-selected-bg shadow-[inset_0_0_0_1px_var(--accent)]"
          : "border-border bg-surface hover:border-border-strong hover:bg-hover-subtle",
      )}
    >
      {imageSrc ? (
        <span className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-surface-sunk">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt="" className="size-full object-cover" />
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-fg">{name}</span>
        {priceLabel ? (
          <span className="text-label text-fg-muted">{priceLabel}</span>
        ) : null}
        {onRequest ? (
          <span className="text-label text-fg-subtle">{OP_AANVRAAG_HINT}</span>
        ) : null}
      </span>
      <span
        aria-hidden
        className={cn(
          "flex size-4 shrink-0 items-center justify-center text-fg",
          !checked && "opacity-0",
        )}
      >
        <Check className="size-3.5" strokeWidth={2.4} />
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full",
          controlMotion,
          checked ? "bg-accent" : "bg-border-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-surface shadow-[var(--shadow-xs)]",
            controlMotion,
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
    </Pressable>
  );
}
