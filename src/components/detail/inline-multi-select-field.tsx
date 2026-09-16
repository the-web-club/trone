"use client";

import { useId, useState } from "react";
import { SavedIndicator } from "@/components/detail/saved-indicator";
import { useSavedFlash } from "@/components/detail/use-saved-flash";
import {
  inlineFieldChrome,
  inlineFieldControl,
  inlineFieldLabel,
} from "@/components/ui/control-styles";
import { MultiSelectMenu } from "@/components/ui/multi-select-menu";
import type { SelectOption } from "@/components/ui/select";
import { cn } from "@/lib/cn";

export function InlineMultiSelectField({
  label,
  values,
  items,
  disabled,
  emptyLabel = "Onbekend",
  layout = "stack",
  span = "auto",
  hint,
  onSave,
}: {
  label: string;
  values: string[];
  items: Array<SelectOption>;
  disabled?: boolean;
  emptyLabel?: string;
  layout?: "stack" | "row";
  span?: "auto" | "full";
  hint?: string;
  onSave: (next: string[]) => Promise<string | null>;
}) {
  const id = useId();
  const [current, setCurrent] = useState(values);
  const [fromServer, setFromServer] = useState(values);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { visible: saved, flash } = useSavedFlash();

  if (values.join("\0") !== fromServer.join("\0")) {
    setFromServer(values);
    setCurrent(values);
  }

  async function onValuesChange(next: string[]) {
    const previous = current;
    setCurrent(next);
    setPending(true);
    setError(null);
    const result = await onSave(next);
    setPending(false);
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

  const isCell = layout === "row";

  return (
    <div
      className={cn(
        "min-w-0",
        span === "full" && "col-span-2",
        isCell ? "inline-field flex flex-col gap-1" : "flex flex-col gap-1",
      )}
    >
      <label htmlFor={id} className={inlineFieldLabel}>
        {label}
      </label>
      <MultiSelectMenu
        id={id}
        values={current}
        onValuesChange={onValuesChange}
        items={items}
        disabled={disabled || pending}
        aria-label={label}
        placeholder={emptyLabel}
        wrap
        className={cn("inline-editable w-full max-w-full cursor-pointer", inlineFieldChrome, inlineFieldControl)}
      />
      {hint ? <p className="text-xs text-fg-muted">{hint}</p> : null}
      {error || saved ? status : null}
    </div>
  );
}
