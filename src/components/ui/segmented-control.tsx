"use client";

import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { controlMotion, focusRingOutline } from "@/components/ui/control-styles";
import { cn } from "@/lib/cn";

const segmentTrackClassName =
  "inline-flex h-8 items-center gap-0.5 rounded-sm bg-surface-sunk p-0.5";

const segmentClassName = cn(
  "inline-flex h-7 items-center gap-1.5 rounded-[4px] px-2 text-sm whitespace-nowrap",
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
          <button
            key={item.value}
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
            {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
            <span className={cn(item.compactLabel && "hidden sm:inline")}>
              {item.label}
            </span>
            {item.compactLabel ? (
              <span className="sr-only sm:hidden">{item.label}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
