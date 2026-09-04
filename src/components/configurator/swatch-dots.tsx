"use client";

import { useRef } from "react";
import { Pressable } from "@/components/motion";
import { controlMotion, focusRingOutline } from "@/components/ui/control-styles";
import { meerprijsLabel } from "@/components/configurator/price-copy";
import { cn } from "@/lib/cn";
import { placeholderSwatchPath } from "@/lib/placeholder-visuals";
import { mediaUrl } from "@/lib/product-visuals";
import type { CatalogValue } from "@/lib/quote-catalog";

export function SwatchDots({
  optionName,
  optionCode,
  values,
  selectedId,
  onSelect,
}: {
  optionName: string;
  optionCode: string;
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
        className="flex flex-wrap items-center gap-3"
      >
        {values.map((value, index) => {
          const isSelected = value.id === selectedId;
          const price = meerprijsLabel(value);
          const aria = price
            ? `${value.value}, ${price}`
            : value.value;

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
                "relative flex size-11 items-center justify-center rounded-full",
                controlMotion,
                focusRingOutline,
                isSelected &&
                  "ring-2 ring-accent ring-offset-2 ring-offset-bg",
              )}
            >
              <span
                className="size-8 overflow-hidden rounded-full border border-border"
                style={
                  !value.swatchImageUrl && value.swatchHex
                    ? { backgroundColor: value.swatchHex }
                    : undefined
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    value.swatchImageUrl
                      ? mediaUrl(value.swatchImageUrl)
                      : placeholderSwatchPath(optionCode, value.value)
                  }
                  alt=""
                  className="size-full object-cover"
                />
              </span>
            </button>
            </Pressable>
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
