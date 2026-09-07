"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { Check, ChevronDown, Plus } from "lucide-react";
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
import type { SelectOption } from "@/components/ui/select";
import { cn } from "@/lib/cn";

export type ComboboxOption<Value extends string = string> = SelectOption<Value>;

export type ComboboxMenuProps<Value extends string = string> = {
  value?: Value;
  defaultValue?: Value;
  onValueChange?: (value: Value) => void;
  items: Array<ComboboxOption<Value>>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  size?: ControlSize;
  disabled?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
  prefix?: string;
  onCreate?: (query: string) => void;
  createLabel?: string;
  createDisabled?: boolean;
};

export function ComboboxMenu<Value extends string = string>({
  value,
  defaultValue,
  onValueChange,
  items,
  placeholder = "Selecteer…",
  searchPlaceholder = "Zoeken…",
  emptyLabel = "Geen resultaten",
  size = "md",
  disabled,
  id,
  name,
  required,
  className,
  contentClassName,
  prefix,
  onCreate,
  createLabel = "Nieuw…",
  createDisabled,
  ...aria
}: ComboboxMenuProps<Value>) {
  const [uncontrolled, setUncontrolled] = React.useState<Value>(
    defaultValue ?? ("" as Value),
  );
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const current = value ?? uncontrolled;
  const selected =
    items.find((option) => option.value === current) ?? null;

  return (
    <ComboboxPrimitive.Root<ComboboxOption<Value>>
      items={items}
      value={selected ?? undefined}
      onValueChange={(next) => {
        if (!next) {
          setUncontrolled("" as Value);
          onValueChange?.("" as Value);
          return;
        }
        setUncontrolled(next.value);
        onValueChange?.(next.value);
      }}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      onInputValueChange={setQuery}
      autoHighlight
      locale="nl"
      isItemEqualToValue={(a, b) => a.value === b.value}
      disabled={disabled}
      id={id}
      name={name}
      required={required}
    >
      <ComboboxPrimitive.Trigger
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
        <ComboboxPrimitive.Icon
          className={cn(
            "shrink-0 text-fg-subtle data-[popup-open]:rotate-180",
            iconMotion,
          )}
        >
          <ChevronDown className="size-3.5" aria-hidden />
        </ComboboxPrimitive.Icon>
      </ComboboxPrimitive.Trigger>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="z-[var(--z-dropdown)] outline-none"
        >
          <ComboboxPrimitive.Popup
            className={cn(
              popupSurface,
              popupMotion,
              "flex max-h-[min(24rem,var(--available-height))] max-w-[var(--available-width)] min-w-[min(max(var(--anchor-width),16rem),var(--available-width))] flex-col overflow-hidden p-0",
              contentClassName,
            )}
            aria-label={aria["aria-label"]}
          >
            <div className="border-b border-border p-1">
              <ComboboxPrimitive.Input
                placeholder={searchPlaceholder}
                className={cn(
                  "h-8 w-full rounded-sm border border-border bg-surface px-2 text-sm text-fg",
                  "placeholder:text-fg-subtle",
                  "hover:border-border-strong",
                  "focus-visible:border-fg focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none",
                )}
              />
            </div>
            <ComboboxPrimitive.Empty className="px-2 py-3 text-sm text-fg-muted">
              {emptyLabel}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 outline-none data-[empty]:p-0">
              {(option: ComboboxOption<Value>) => (
                <ComboboxPrimitive.Item
                  key={option.value}
                  value={option}
                  disabled={option.disabled}
                  className={cn(
                    popupItem,
                    "relative pr-2 pl-7 data-[selected]:font-medium",
                  )}
                >
                  <ComboboxPrimitive.ItemIndicator className="absolute left-2 inline-flex text-fg">
                    <Check className="size-3.5" aria-hidden />
                  </ComboboxPrimitive.ItemIndicator>
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.hint ? (
                    <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
                      {option.hint}
                    </span>
                  ) : null}
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
            {onCreate ? (
              <div className="border-t border-border p-1">
                <button
                  type="button"
                  disabled={createDisabled}
                  className={cn(
                    popupItem,
                    "w-full text-fg-muted",
                    createDisabled && "opacity-50",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    if (createDisabled) return;
                    onCreate(query.trim());
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Plus className="size-3.5" aria-hidden />
                  <span className="min-w-0 truncate">{createLabel}</span>
                </button>
              </div>
            ) : null}
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
