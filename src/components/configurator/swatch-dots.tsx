"use client";

import { useRef } from "react";
import { Pressable } from "@/components/motion";
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
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function move(index: number, delta: number) {
    if (values.length === 0) return;
    const nextIndex = (index + delta + values.length) % values.length;
    const next = values[nextIndex];
    if (!next) return;
    onSelect(next.id);
    buttonRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-label={optionName}
        className="flex flex-wrap items-start gap-3"
      >
        {values.map((value, index) => {
          const isSelected = value.id === selectedId;
          const price = meerprijsLabel(value);
          const aria = price
            ? `${value.value}, ${price}`
            : value.value;
          const swatchImage = value.swatchImageUrl
            ? mediaUrl(value.swatchImageUrl)
            : null;
          const swatchHex =
            !swatchImage && value.swatchHex ? value.swatchHex : undefined;

          return (
            <Pressable key={value.id}>
            <button
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={aria}
              title={aria}
              tabIndex={isSelected || (!selectedId && index === 0) ? 0 : -1}
              onClick={() => onSelect(value.id)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  move(index, 1);
                }
                if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  move(index, -1);
                }
                if (event.key === "Home") {
                  event.preventDefault();
                  move(index, -index);
                }
                if (event.key === "End") {
                  event.preventDefault();
                  move(index, values.length - 1 - index);
                }
              }}
              className={cn(
                "flex w-20 flex-col items-center gap-1.5 rounded-md px-0.5 py-0.5",
                controlMotion,
                focusRingOutline,
              )}
            >
              <span
                className={cn(
                  "relative flex size-11 items-center justify-center rounded-full",
                  isSelected &&
                    "ring-2 ring-accent ring-offset-2 ring-offset-bg",
                )}
              >
                <span
                  className="size-8 overflow-hidden rounded-full border border-border bg-surface-sunk"
                  style={swatchHex ? { backgroundColor: swatchHex } : undefined}
                >
                  {swatchImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={swatchImage}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : null}
                </span>
              </span>
              <span
                className={cn(
                  "w-full text-center text-label leading-tight break-words",
                  isSelected ? "font-medium text-fg" : "text-fg-muted",
                )}
              >
                {value.value}
              </span>
              {price ? (
                <span className="w-full text-center text-label leading-tight text-fg-subtle">
                  {price}
                </span>
              ) : null}
            </button>
            </Pressable>
          );
        })}
      </div>
      <p className="sr-only" aria-live="polite">
        {selected
          ? [selected.value, meerprijsLabel(selected)].filter(Boolean).join(", ")
          : "Kies een kleur"}
      </p>
    </div>
  );
}
