"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTimelineEventAction } from "@/app/(beveiligd)/actions/timeline-actions";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { timelineEventTypeLabels } from "@/lib/timeline-validation";

export function TimelineComposer({
  dealId,
  contactId,
  companyId,
  plain = false,
  onSuccess,
}: {
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  plain?: boolean;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createTimelineEventAction,
    null,
  );
  const notifiedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!state?.loggedAt || notifiedAt.current === state.loggedAt) return;
    notifiedAt.current = state.loggedAt;
    onSuccess?.();
  }, [state?.loggedAt, onSuccess]);

  return (
    <form
      key={state?.loggedAt ?? "new"}
      action={formAction}
      className={
        plain
          ? "flex flex-col gap-3"
          : "flex flex-col gap-3 rounded-md border border-border bg-surface p-3"
      }
    >
      {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
      {contactId ? (
        <input type="hidden" name="contactId" value={contactId} />
      ) : null}
      {companyId ? (
        <input type="hidden" name="companyId" value={companyId} />
      ) : null}
      <FormField id="type" label="Type">
        <Select name="type" defaultValue="NOTE">
          <option value="NOTE">{timelineEventTypeLabels.NOTE}</option>
          <option value="CALL">{timelineEventTypeLabels.CALL}</option>
          <option value="EMAIL">{timelineEventTypeLabels.EMAIL}</option>
          <option value="MEETING">{timelineEventTypeLabels.MEETING}</option>
          <option value="DEMO">{timelineEventTypeLabels.DEMO}</option>
        </Select>
      </FormField>
      <FormField id="body" label="Toelichting">
        <Textarea name="body" placeholder="Wat is er gebeurd?" />
      </FormField>
      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" loading={pending}>
          Vastleggen
        </Button>
      </div>
    </form>
  );
}
