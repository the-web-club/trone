"use client";

import {
  SubmitStatusButton,
  type SubmitStatus,
} from "@/components/ui/submit-status-button";

export type LeadSubmitStatus = SubmitStatus;

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
  return (
    <SubmitStatusButton
      readyLabel={readyLabel}
      pendingLabel={pendingLabel}
      successLabel={successLabel}
      status={status}
    />
  );
}
