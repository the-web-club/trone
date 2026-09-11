"use client";

import { useCallback, useState } from "react";
import { CollapsibleComposer } from "@/components/detail/collapsible-composer";
import { FollowUpComposer } from "@/components/task/follow-up-composer";
import { Collapse } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { TimelineComposer } from "@/components/timeline/timeline-composer";

type OpenComposer = "event" | "followUp" | null;

export function CollapsibleTimelineComposer({
  dealId,
  contactId,
  companyId,
}: {
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
}) {
  const [open, setOpen] = useState<OpenComposer>(null);
  const close = useCallback(() => setOpen(null), []);
  const showFollowUp = Boolean(dealId);

  if (!showFollowUp) {
    return (
      <CollapsibleComposer label="Gebeurtenis registreren">
        {({ close: closeEvent }) => (
          <TimelineComposer
            dealId={dealId}
            contactId={contactId}
            companyId={companyId}
            plain
            onSuccess={closeEvent}
          />
        )}
      </CollapsibleComposer>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start text-fg-muted"
          aria-expanded={open === "event"}
          onClick={() =>
            setOpen((current) => (current === "event" ? null : "event"))
          }
        >
          {open === "event" ? "Annuleren" : "Gebeurtenis registreren"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start text-fg-muted"
          aria-expanded={open === "followUp"}
          onClick={() =>
            setOpen((current) => (current === "followUp" ? null : "followUp"))
          }
        >
          {open === "followUp" ? "Annuleren" : "Vervolgactie"}
        </Button>
      </div>
      <Collapse open={open === "event"}>
        <div className="pb-1">
          <TimelineComposer
            dealId={dealId}
            contactId={contactId}
            companyId={companyId}
            plain
            onSuccess={close}
          />
        </div>
      </Collapse>
      <Collapse open={open === "followUp"}>
        <div className="pb-1">
          <FollowUpComposer
            dealId={dealId}
            contactId={contactId}
            companyId={companyId}
            plain
            onSuccess={close}
          />
        </div>
      </Collapse>
    </div>
  );
}
