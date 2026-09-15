"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type LeadSubmitStatus = "idle" | "submitting" | "success";

export function LeadSubmitButton({
  readyLabel,
  pendingLabel = "Bezig met opslaan…",
  successLabel = "Lead toegevoegd",
  status,
}: {
  readyLabel: string;
  pendingLabel?: string;
  successLabel?: string;
  status: LeadSubmitStatus;
}) {
  const busy = status === "submitting" || status === "success";
  const label =
    status === "submitting"
      ? pendingLabel
      : status === "success"
        ? successLabel
        : readyLabel;

  return (
    <Button
      type="submit"
      disabled={busy}
      aria-busy={status === "submitting" || undefined}
      className={cn(busy && "disabled:opacity-100")}
    >
      <span className="grid justify-items-center">
        <span className="invisible col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5">
          <Loader2 className="size-3.5" aria-hidden />
          {pendingLabel}
        </span>
        <span className="invisible col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5">
          {successLabel}
        </span>
        <span className="invisible col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5">
          {readyLabel}
        </span>
        <span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5">
          {status === "submitting" ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : null}
          {label}
        </span>
      </span>
    </Button>
  );
}
