"use client";

import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { Pressable } from "@/components/motion";
import { controlMotion, focusRingOutline } from "@/components/ui/control-styles";
import { cn } from "@/lib/cn";

const segmentTrackClassName =
  "inline-flex min-h-11 items-center gap-0.5 rounded-sm bg-surface-sunk p-0.5 md:h-8 md:min-h-8";

const segmentClassName = cn(
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[4px] px-2 text-sm whitespace-nowrap md:h-7 md:min-h-7 md:min-w-0 md:gap-1.5",
  controlMotion,
  focusRingOutline,
);

const segmentStateClassName = (active: boolean) =>
  active
    ? "bg-surface font-medium text-fg shadow-[var(--shadow-xs)]"
    : "text-fg-muted hover:text-fg";

export type SegmentedControlItem<Value extends string> = {
  value: Value;
  label: string;
  icon?: LucideIcon;
  compactLabel?: boolean;
};

export type SegmentedControlProps<Value extends string> = {
  value: Value;
  onValueChange: (value: Value) => void;
  items: Array<SegmentedControlItem<Value>>;
  disabled?: boolean;
  className?: string;
  "aria-label": string;
};

export function SegmentedControl<Value extends string>({
  value,
  onValueChange,
  items,
  disabled = false,
  className,
  ...aria
}: SegmentedControlProps<Value>) {
  return (
    <div
      role="group"
      aria-label={aria["aria-label"]}
      className={cn(segmentTrackClassName, className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        const Icon = item.icon;
        return (
          <Pressable key={item.value} disabled={disabled}>
          <button
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => {
              if (active) return;
              onValueChange(item.value);
            }}
            className={cn(
              segmentClassName,
              "disabled:pointer-events-none disabled:opacity-45",
              segmentStateClassName(active),
            )}
          >
            {Icon ? (
              <Icon className="size-4 shrink-0 md:size-3.5" aria-hidden />
            ) : null}
            <span className={cn(item.compactLabel && "hidden sm:inline")}>
              {item.label}
            </span>
            {item.compactLabel ? (
              <span className="sr-only sm:hidden">{item.label}</span>
            ) : null}
          </button>
          </Pressable>
        );
      })}
    </div>
  );
}
