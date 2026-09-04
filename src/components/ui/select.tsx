"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { iconMotion } from "@/components/motion/styles";
import {
  controlSize,
  fieldBase,
  popupItem,
  popupMotion,
  popupSurface,
  type ControlSize,
} from "@/components/ui/control-styles";
import { cn } from "@/lib/cn";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      data-field-control=""
      className={cn("flex appearance-none bg-surface", fieldBase, controlSize.md, className)}
      {...props}
    >
      {children}
    </select>
  );
});

export type SelectOption<Value extends string = string> = {
  value: Value;
  label: string;
  /** Muted trailing text, e.g. a facet count. */
  hint?: string;
  disabled?: boolean;
};

export type SelectMenuProps<Value extends string = string> = {
  value?: Value;
  defaultValue?: Value;
  onValueChange?: (value: Value) => void;
  items: Array<SelectOption<Value>>;
  placeholder?: string;
  size?: ControlSize;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
  prefix?: string;
};

export function SelectMenu<Value extends string = string>({
  value,
  defaultValue,
  onValueChange,
  items,
  placeholder = "Selecteer…",
  size = "md",
  disabled,
  id,
  name,
  className,
  contentClassName,
  prefix,
  ...aria
}: SelectMenuProps<Value>) {
  const [uncontrolled, setUncontrolled] = React.useState<Value>(
    defaultValue ?? ("" as Value),
  );
  const current = value ?? uncontrolled;
  const selected = items.find((option) => option.value === current) ?? null;

  return (
    <SelectPrimitive.Root<Value>
      value={current}
      onValueChange={(next) => {
        if (next === null) return;
        setUncontrolled(next);
        onValueChange?.(next);
      }}
      disabled={disabled}
      id={id}
      name={name}
      items={items}
    >
      <SelectPrimitive.Trigger
        data-field-control=""
        aria-label={aria["aria-label"]}
        className={cn(
          "inline-flex cursor-default items-center justify-between gap-1.5 select-none",
          fieldBase,
          controlSize[size],
          "data-[popup-open]:border-border-strong",
          "data-[disabled]:cursor-not-allowed data-[disabled]:text-fg-muted data-[disabled]:opacity-70 data-[disabled]:hover:border-border",
          className,
        )}
      >
        {prefix ? (
          <span className="shrink-0 text-fg-subtle">{prefix}</span>
        ) : null}
        <span className="min-w-0 flex-1 truncate text-left">
          {selected ? (
            selected.label
          ) : (
            <span className="text-fg-subtle">{placeholder}</span>
          )}
        </span>
        <SelectPrimitive.Icon className={cn("shrink-0 text-fg-subtle data-[popup-open]:rotate-180", iconMotion)}>
          <ChevronDown className="size-3.5" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          side="bottom"
          align="start"
          sideOffset={4}
          alignItemWithTrigger={false}
          collisionPadding={8}
          className="z-[var(--z-dropdown)] outline-none"
        >
          <SelectPrimitive.Popup
            className={cn(
              popupSurface,
              popupMotion,
              "max-h-[min(20rem,var(--available-height))] max-w-[var(--available-width)] min-w-[min(max(var(--anchor-width),11rem),var(--available-width))] overflow-y-auto overscroll-contain",
              contentClassName,
            )}
          >
            <SelectPrimitive.List>
              {items.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    popupItem,
                    "relative pr-2 pl-7 data-[selected]:font-medium",
                  )}
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex text-fg">
                    <Check className="size-3.5" aria-hidden />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText className="min-w-0 flex-1 truncate">
                    {option.label}
                  </SelectPrimitive.ItemText>
                  {option.hint ? (
                    <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
                      {option.hint}
                    </span>
                  ) : null}
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
