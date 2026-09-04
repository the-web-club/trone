"use client";

import { cn } from "@/lib/cn";
import { formatEuroExact } from "@/lib/format";
import { mediaUrl } from "@/lib/product-visuals";
import type { CatalogValue } from "@/lib/quote-catalog";

export function OptionSwatches({
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
  return (
    <div className="flex flex-col gap-1">
      <p className="text-label font-medium text-fg-muted">{optionName}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => {
          const selected = value.id === selectedId;
          const price = value.priceOnRequest
            ? "prijs op aanvraag"
            : value.priceDelta
              ? `+${formatEuroExact(value.priceDelta)}`
              : "geen meerprijs";
          const title = `${value.value} (${price})`;
          return (
            <button
              key={value.id}
              type="button"
              title={title}
              aria-label={title}
              aria-pressed={selected}
              onClick={() => onSelect(value.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-sm p-1",
                selected && "bg-selected",
              )}
            >
              <span
                className={cn(
                  "size-8 overflow-hidden rounded-full border border-border",
                  selected && "ring-2 ring-ring ring-offset-2 ring-offset-bg",
                )}
                style={
                  value.swatchHex ? { backgroundColor: value.swatchHex } : undefined
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
              <span className="max-w-20 truncate text-xs text-fg">{value.value}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
