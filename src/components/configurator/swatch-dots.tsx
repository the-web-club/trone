"use client";

import { controlMotion, focusRingOutline } from "@/components/ui/control-styles";
import { meerprijsLabel } from "@/components/configurator/price-copy";
import { cn } from "@/lib/cn";
import { mediaUrl } from "@/lib/product-visuals";
import type { CatalogValue } from "@/lib/quote-catalog";

export function SwatchDots({
  optionName,
  values,
  selectedId,
  onSelect,
}: {
  optionName: string;
  values: CatalogValue[];
  selectedId: string;
  onSelect: (optionValueId: string) => void;
}) {
  const selected = values.find((value) => value.id === selectedId);

  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-label={optionName}
        className="flex flex-wrap items-center gap-3"
      >
        {values.map((value) => {
          const isSelected = value.id === selectedId;
          const price = meerprijsLabel(value);
          const aria = price
            ? `${optionName}: ${value.value}, ${price}`
            : `${optionName}: ${value.value}`;

          return (
            <button
              key={value.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={aria}
              title={aria}
              onClick={() => onSelect(value.id)}
              className={cn(
                "group relative flex size-10 items-center justify-center rounded-full",
                controlMotion,
                focusRingOutline,
              )}
            >
              <span
                className={cn(
                  "size-8 overflow-hidden rounded-full border border-border",
                  isSelected &&
                    "ring-2 ring-accent ring-offset-2 ring-offset-bg",
                )}
                style={
                  value.swatchHex
                    ? { backgroundColor: value.swatchHex }
                    : undefined
                }
              >
                {value.swatchImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(value.swatchImageUrl)}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <p className="min-h-4 text-sm text-fg" aria-live="polite">
        {selected ? (
          <>
            {selected.value}
            {meerprijsLabel(selected) ? (
              <span className="text-fg-muted">
                {" · "}
                {meerprijsLabel(selected)}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-fg-muted">Kies een kleur</span>
        )}
      </p>
    </div>
  );
}
