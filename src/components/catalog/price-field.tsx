"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatEuroExact } from "@/lib/format";
import { cn } from "@/lib/cn";

export function PriceField({
  value,
  canEdit,
  onRequest = false,
  ariaLabel,
  onSave,
}: {
  value: number;
  canEdit: boolean;
  onRequest?: boolean;
  ariaLabel: string;
  onSave: (next: number) => Promise<{ error?: string }>;
}) {
  const [draft, setDraft] = useState(String(value));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  if (onRequest) {
    return <span className="text-sm text-warning">Prijs op aanvraag</span>;
  }

  if (!canEdit) {
    return (
      <span className="text-sm text-fg tabular-nums">{formatEuroExact(value)}</span>
    );
  }

  async function save() {
    const next = Number(draft.replace(",", "."));
    if (next === value) {
      setDraft(String(value));
      return;
    }
    setStatus("saving");
    setError(null);
    const result = await onSave(next);
    if (result.error) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setDraft(String(next));
    setStatus("saved");
    window.setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <Input
        type="number"
        min="0"
        step="0.01"
        inputSize="sm"
        aria-label={ariaLabel}
        value={draft}
        disabled={status === "saving"}
        className={cn("w-28 text-right tabular-nums", status === "error" && "border-danger")}
        onChange={(event) => {
          setDraft(event.target.value);
          if (status !== "idle") setStatus("idle");
        }}
        onBlur={() => {
          void save();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
      {status === "saved" ? (
        <span className="text-xs text-success">Opgeslagen</span>
      ) : null}
      {error ? (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
