"use client";

import { Check, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { iconMotion } from "@/components/motion/styles";
import {
  controlSize,
  fieldBase,
  popupItem,
  type ControlSize,
} from "@/components/ui/control-styles";
import {
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { SelectOption } from "@/components/ui/select";
import { cn } from "@/lib/cn";

export function MultiSelectMenu<Value extends string = string>({
  values,
  onValuesChange,
  items,
  placeholder = "Selecteer…",
  prefix,
  emptyLabel = "Geen resultaten",
  size = "md",
  disabled,
  id,
  className,
  contentClassName,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  wrap = false,
}: {
  values: Value[];
  onValuesChange: (next: Value[]) => void;
  items: Array<SelectOption<Value>>;
  placeholder?: string;
  prefix?: string;
  emptyLabel?: string;
  size?: ControlSize;
  disabled?: boolean;
  id?: string;
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
  wrap?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = useMemo(
    () => items.filter((item) => values.includes(item.value)),
    [items, values],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.label, item.value, item.hint]
        .filter((part): part is string => Boolean(part))
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [items, query]);

  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (selected[0]?.label ?? placeholder)
        : `${selected.length} geselecteerd`;

  function toggle(value: Value) {
    if (values.includes(value)) {
      onValuesChange(values.filter((item) => item !== value));
      return;
    }
    onValuesChange([...values, value]);
  }

  return (
    <PopoverRoot
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        id={id}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        data-field-control=""
        data-popup-open={open ? "" : undefined}
        className={cn(
          "inline-flex cursor-default items-center justify-between gap-1.5 select-none",
          fieldBase,
          controlSize[size],
          "data-[popup-open]:border-border-strong",
          wrap && "h-auto min-h-11 items-start py-1 md:min-h-8",
          className,
        )}
      >
        {prefix ? (
          <span className="shrink-0 text-fg-subtle">{prefix}</span>
        ) : null}
        <span
          className={cn(
            "min-w-0 flex-1 text-left",
            wrap ? "break-words whitespace-normal" : "truncate",
            selected.length === 0 && "text-fg-subtle",
          )}
        >
          {summary}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-fg-subtle",
            open && "rotate-180",
            iconMotion,
          )}
          aria-hidden
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("w-[min(22rem,var(--available-width))] p-1", contentClassName)}
      >
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Zoeken…"
          aria-label="Zoeken"
          className={cn(
            fieldBase,
            "mb-1 h-8 min-h-8 px-2 text-sm",
          )}
        />
        {filtered.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-fg-muted">{emptyLabel}</p>
        ) : (
          <ul className="max-h-64 overflow-y-auto">
            {filtered.map((item) => {
              const checked = values.includes(item.value);
              return (
                <li key={item.value}>
                  <button
                    type="button"
                    disabled={item.disabled}
                    onClick={() => toggle(item.value)}
                    className={cn(popupItem, "w-full text-left")}
                  >
                    <Check
                      className={cn(
                        "size-3.5 shrink-0",
                        checked ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.hint ? (
                      <span className="text-xs text-fg-subtle">{item.hint}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </PopoverRoot>
  );
}
