"use client";

import { useId, useState } from "react";
import { SavedIndicator } from "@/components/detail/saved-indicator";
import { useSavedFlash } from "@/components/detail/use-saved-flash";
import { ComboboxMenu } from "@/components/ui/combobox";
import type { SelectOption } from "@/components/ui/select";
import { cn } from "@/lib/cn";

export const INLINE_SELECT_EMPTY = "__none__";

export function InlineSelectField({
  label,
  value,
  items,
  disabled,
  hideLabel = false,
  compact = false,
  layout = "stack",
  span = "auto",
  searchPlaceholder,
  triggerClassName,
  onSave,
  onCreate,
  createLabel,
  createDisabled,
}: {
  label: string;
  value: string;
  items: Array<SelectOption>;
  disabled?: boolean;
  hideLabel?: boolean;
  compact?: boolean;
  layout?: "stack" | "row";
  span?: "auto" | "full";
  searchPlaceholder?: string;
  triggerClassName?: string;
  onSave: (next: string) => Promise<string | false | null>;
  onCreate?: (query: string) => void;
  createLabel?: string;
  createDisabled?: boolean;
}) {
  const id = useId();
  const [current, setCurrent] = useState(value);
  const [fromServer, setFromServer] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { visible: saved, flash } = useSavedFlash();

  if (value !== fromServer) {
    setFromServer(value);
    setCurrent(value);
  }

  async function onValueChange(next: string) {
    if (next === current) return;
    const previous = current;
    setCurrent(next);
    setPending(true);
    setError(null);
    const result = await onSave(next === INLINE_SELECT_EMPTY ? "" : next);
    setPending(false);
    if (result === false) {
      setCurrent(previous);
      return;
    }
    if (result) {
      setCurrent(previous);
      setError(result);
      return;
    }
    flash();
  }

  const status = error ? (
    <p className="inline-field-status text-xs text-danger" role="alert">
      {error}
    </p>
  ) : (
    <span className="inline-field-status">
      <SavedIndicator visible={saved} />
    </span>
  );

  const isCell = layout === "row" && !compact && !hideLabel;

  return (
    <div
      className={cn(
        "min-w-0",
        span === "full" && "col-span-2",
        compact
          ? "flex flex-row items-center gap-2"
          : isCell
            ? "inline-field flex flex-col gap-0.5"
            : "flex flex-col gap-1",
      )}
    >
      {hideLabel ? (
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
      ) : (
        <label htmlFor={id} className="text-label font-medium text-fg-muted">
          {label}
        </label>
      )}
      <div className="min-w-0">
        <ComboboxMenu
          id={id}
          value={current || INLINE_SELECT_EMPTY}
          onValueChange={onValueChange}
          items={items}
          disabled={disabled || pending}
          aria-label={label}
          searchPlaceholder={searchPlaceholder}
          wrap={!compact}
          className={cn(
            "inline-editable w-full max-w-full cursor-pointer border-transparent bg-transparent px-1",
            "hover:border-border hover:bg-surface",
            "data-[popup-open]:border-border-strong data-[popup-open]:bg-surface",
            compact && "w-auto",
            triggerClassName,
          )}
          onCreate={onCreate}
          createLabel={createLabel}
          createDisabled={createDisabled}
        />
      </div>
      {error || saved ? status : null}
    </div>
  );
}
