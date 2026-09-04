"use client";

import { controlMotion, focusRingOutline } from "@/components/ui/control-styles";
import { OP_AANVRAAG_HINT } from "@/components/configurator/price-copy";
import { cn } from "@/lib/cn";

export function OptionToggle({
  name,
  checked,
  priceLabel,
  onRequest,
  onChange,
}: {
  name: string;
  checked: boolean;
  priceLabel?: string | null;
  onRequest?: boolean;
  onChange: (next: boolean) => void;
}) {
  const aria = [name, priceLabel, checked ? "aan" : "uit"]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={aria}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-md px-3.5 py-3 text-left",
        controlMotion,
        focusRingOutline,
        checked
          ? "bg-selected-bg shadow-[inset_0_0_0_1px_var(--accent)]"
          : "bg-transparent hover:bg-hover-subtle",
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
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
  );
}
