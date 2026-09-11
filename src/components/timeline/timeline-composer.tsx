"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTimelineEventAction } from "@/app/(beveiligd)/actions/timeline-actions";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { SelectMenu } from "@/components/ui/select";
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
        <SelectMenu
          name="type"
          defaultValue="NOTE"
          items={[
            { value: "NOTE", label: timelineEventTypeLabels.NOTE },
            { value: "CALL", label: timelineEventTypeLabels.CALL },
            { value: "EMAIL", label: timelineEventTypeLabels.EMAIL },
            { value: "MEETING", label: timelineEventTypeLabels.MEETING },
            { value: "DEMO", label: timelineEventTypeLabels.DEMO },
          ]}
          searchPlaceholder="Zoek een type…"
        />
      </FormField>
      <FormField id="body" label="Toelichting">
        <RichTextEditor name="body" placeholder="Wat is er gebeurd?" />
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
