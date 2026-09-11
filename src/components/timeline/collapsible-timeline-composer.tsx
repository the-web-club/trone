"use client";

import { CollapsibleComposer } from "@/components/detail/collapsible-composer";
import { TimelineComposer } from "@/components/timeline/timeline-composer";

export function CollapsibleTimelineComposer({
  dealId,
  contactId,
  companyId,
}: {
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
}) {
  return (
    <CollapsibleComposer label="Gebeurtenis registreren">
      {({ close }) => (
        <TimelineComposer
          dealId={dealId}
          contactId={contactId}
          companyId={companyId}
          plain
          onSuccess={close}
        />
      )}
    </CollapsibleComposer>
  );
}
