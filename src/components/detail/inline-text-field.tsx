"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SavedIndicator } from "@/components/detail/saved-indicator";
import { useSavedFlash } from "@/components/detail/use-saved-flash";
import { Input } from "@/components/ui/input";
import { focusRingOutline } from "@/components/ui/control-styles";
import { cn } from "@/lib/cn";

export function InlineTextField({
  label,
  value,
  displayValue,
  placeholder = "—",
  type = "text",
  required = false,
  variant = "body",
  inputMode,
  min,
  step,
  onSave,
}: {
  label: string;
  value: string;
  displayValue?: React.ReactNode;
  placeholder?: string;
  type?: "text" | "number" | "email" | "tel" | "url";
  required?: boolean;
  variant?: "body" | "title";
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  min?: number | string;
  step?: number | string;
  onSave: (next: string) => Promise<string | false | null>;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [committed, setCommitted] = useState(value);
  const [fromServer, setFromServer] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const { visible: saved, flash } = useSavedFlash();

  if (value !== fromServer) {
    setFromServer(value);
    setCommitted(value);
    if (!editing) setDraft(value);
  }

  useEffect(() => {
    if (!editing) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [editing]);

  function startEditing() {
    setDraft(committed);
    setError(null);
    cancelledRef.current = false;
    setEditing(true);
  }

  async function commit(nextRaw: string) {
    const next = nextRaw.trim();
    if (next === committed.trim()) {
      setEditing(false);
      setError(null);
      return;
    }
    if (required && next === "") {
      setError(`${label} is verplicht`);
      return;
    }

    const previous = committed;
    setCommitted(next);
    setEditing(false);
    setError(null);

    const result = await onSave(next);
    if (result === false) {
      setCommitted(previous);
      setDraft(previous);
      setEditing(false);
      return;
    }
    if (result) {
      setCommitted(previous);
      setDraft(nextRaw);
      setEditing(true);
      setError(result);
      return;
    }
    flash();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelledRef.current = true;
      setDraft(committed);
      setError(null);
      setEditing(false);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      void commit(draft);
    }
  }

  function onBlur() {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    void commit(draft);
  }

  const isTitle = variant === "title";
  const shown =
    displayValue != null && committed === value
      ? displayValue
      : committed === ""
        ? placeholder
        : committed;
  const isEmpty = committed === "";

  const control = editing ? (
    <Input
      ref={inputRef}
      id={id}
      type={type}
      inputMode={inputMode}
      min={min}
      step={step}
      value={draft}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      className={
        isTitle
          ? "h-auto border-transparent bg-transparent px-1 py-0 text-[length:inherit] leading-[inherit] tracking-[inherit] shadow-none"
          : undefined
      }
    />
  ) : (
    <button
      type="button"
      id={id}
      aria-label={`${label} bewerken`}
      onClick={startEditing}
      className={cn(
        "max-w-full rounded-sm text-left",
        isTitle ? "-mx-1 px-1" : "min-h-8 w-full px-1.5 py-1 text-sm",
        isEmpty ? "text-fg-muted" : "text-fg",
        "hover:bg-hover",
        focusRingOutline,
      )}
    >
      {shown}
    </button>
  );

  const status = error ? (
    <p id={`${id}-error`} className="text-xs text-danger" role="alert">
      {error}
    </p>
  ) : saved ? (
    <SavedIndicator visible />
  ) : null;

  return (
    <div className={cn("min-w-0", isTitle ? "w-full" : "flex flex-col gap-1")}>
      {isTitle ? (
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
      ) : (
        <label htmlFor={id} className="text-label font-medium text-fg-muted">
          {label}
        </label>
      )}
      {isTitle ? <h1 className="page-header-title">{control}</h1> : control}
      {status}
    </div>
  );
}
