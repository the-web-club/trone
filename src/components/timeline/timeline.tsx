import { CollapsibleTimelineComposer } from "@/components/timeline/collapsible-timeline-composer";
import { Stagger, StaggerItem } from "@/components/motion";
import { TimelineComposer } from "@/components/timeline/timeline-composer";
import { TimelineEventItem } from "@/components/timeline/timeline-event-item";
import type { TimelineEventRecord } from "@/lib/timeline-service";

export function Timeline({
  events,
  dealId,
  contactId,
  companyId,
  title = "Tijdlijn",
  compact = false,
  canEdit = false,
  canDelete = false,
}: {
  events: TimelineEventRecord[];
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  title?: string;
  compact?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const composer = !canEdit ? null : compact ? (
    <CollapsibleTimelineComposer
      dealId={dealId}
      contactId={contactId}
      companyId={companyId}
    />
  ) : (
    <TimelineComposer
      dealId={dealId}
      contactId={contactId}
      companyId={companyId}
    />
  );

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-label font-medium tracking-wide text-fg-muted uppercase">
        {title}
      </h2>
      {composer}
      {events.length === 0 ? (
        compact ? null : (
          <p className="text-sm text-fg-muted">Nog geen gebeurtenissen.</p>
        )
      ) : (
        <Stagger as="ul" className="flex flex-col gap-1.5">
          {events.map((event) => (
            <StaggerItem key={event.id} as="li">
              <TimelineEventItem
                event={event}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  );
}
