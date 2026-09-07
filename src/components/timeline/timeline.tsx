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
}: {
  events: TimelineEventRecord[];
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  title?: string;
  compact?: boolean;
}) {
  const composer = compact ? (
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
    <section className="flex flex-col gap-4">
      <h2 className="text-md font-medium text-fg">{title}</h2>
      {composer}
      {events.length === 0 ? (
        compact ? null : (
          <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg-muted">
            Nog geen gebeurtenissen.
          </p>
        )
      ) : (
        <Stagger as="ul" className="flex flex-col gap-2">
          {events.map((event) => (
            <StaggerItem key={event.id} as="li">
              <TimelineEventItem event={event} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  );
}
