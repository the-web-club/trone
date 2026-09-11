"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createTimelineEventAction } from "@/app/(beveiligd)/actions/timeline-actions";
import { FollowUpFields } from "@/components/task/follow-up-fields";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { SelectMenu } from "@/components/ui/select";
import {
  timelineDirectionLabels,
  timelineEventTypeLabels,
  timelineOutcomeLabels,
} from "@/lib/timeline-validation";

const channelItems = [
  { value: "CALL", label: timelineEventTypeLabels.CALL },
  { value: "EMAIL", label: timelineEventTypeLabels.EMAIL },
  { value: "MEETING", label: timelineEventTypeLabels.MEETING },
  { value: "DEMO", label: timelineEventTypeLabels.DEMO },
  { value: "NOTE", label: timelineEventTypeLabels.NOTE },
];

const directionItems = [
  { value: "OUTBOUND", label: timelineDirectionLabels.OUTBOUND },
  { value: "INBOUND", label: timelineDirectionLabels.INBOUND },
];

const outcomeItems = [
  { value: "__none", label: "Geen" },
  { value: "CONNECTED", label: timelineOutcomeLabels.CONNECTED },
  { value: "NO_ANSWER", label: timelineOutcomeLabels.NO_ANSWER },
  { value: "VOICEMAIL", label: timelineOutcomeLabels.VOICEMAIL },
  { value: "BUSY", label: timelineOutcomeLabels.BUSY },
  { value: "WRONG_NUMBER", label: timelineOutcomeLabels.WRONG_NUMBER },
];

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
  const [dateOnly, setDateOnly] = useState(false);

  useEffect(() => {
    if (!state?.loggedAt || notifiedAt.current === state.loggedAt) return;
    notifiedAt.current = state.loggedAt;
    setDateOnly(false);
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormField id="type" label="Kanaal">
          <SelectMenu
            name="type"
            defaultValue="CALL"
            items={channelItems}
            searchPlaceholder="Zoek een kanaal…"
          />
        </FormField>
        <FormField id="direction" label="Richting">
          <SelectMenu
            name="direction"
            defaultValue="OUTBOUND"
            items={directionItems}
            searchPlaceholder="Zoek een richting…"
          />
        </FormField>
        <FormField id="outcome" label="Uitkomst">
          <SelectMenu
            name="outcome"
            defaultValue="__none"
            items={outcomeItems}
            searchPlaceholder="Zoek een uitkomst…"
          />
        </FormField>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-fg-muted">
          Laat leeg voor de huidige datum en tijd. Vul in om de interactie op de
          juiste plek in de tijdlijn te zetten.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="occurredDate" label="Datum">
            <Input type="date" name="occurredDate" />
          </FormField>
          <FormField id="occurredTime" label="Tijd">
            <Input type="time" name="occurredTime" />
          </FormField>
        </div>
      </div>

      <FormField id="body" label="Wat is besproken?">
        <RichTextEditor
          name="body"
          tall
          placeholder="Kort wat er is gezegd of afgesproken."
        />
      </FormField>

      <fieldset className="flex flex-col gap-3 rounded-md border border-border p-3">
        <legend className="px-1 text-label font-medium text-fg-muted">
          Vervolgactie plannen
        </legend>
        <FollowUpFields
          idPrefix="event-"
          dateOnly={dateOnly}
          onDateOnlyChange={setDateOnly}
        />
        <p className="text-xs text-fg-muted">
          Optioneel. Vul een datum in om een taak te plannen.
        </p>
      </fieldset>

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
