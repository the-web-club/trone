"use client";

import * as React from "react";
import {
  ComboboxMenu,
  type ComboboxMenuProps,
} from "@/components/ui/combobox";
import {
  controlSize,
  fieldBase,
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
  /** When set, show a user avatar (photo or initials) next to the label. */
  image?: string | null;
};

export type SelectMenuProps<Value extends string = string> =
  ComboboxMenuProps<Value>;

/** Doorzoekbare select; dezelfde popup als de combobox op lead en offerte. */
export function SelectMenu<Value extends string = string>(
  props: SelectMenuProps<Value>,
) {
  return <ComboboxMenu {...props} />;
}
