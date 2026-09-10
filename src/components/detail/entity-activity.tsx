import { Timeline } from "@/components/timeline/timeline";
import {
  isAdminSession,
  isViewerSession,
  requireSession,
} from "@/lib/auth-session";
import {
  listTimelineForCompany,
  listTimelineForContact,
  listTimelineForDeal,
} from "@/lib/timeline-service";

async function timelinePermissions() {
  const session = await requireSession();
  return {
    canEdit: !isViewerSession(session),
    canDelete: isAdminSession(session),
  };
}

export async function CompanyTimeline({
  companyId,
  compact = false,
}: {
  companyId: string;
  compact?: boolean;
}) {
  const [events, permissions] = await Promise.all([
    listTimelineForCompany(companyId),
    timelinePermissions(),
  ]);
  return (
    <Timeline
      compact={compact}
      events={events}
      companyId={companyId}
      {...permissions}
    />
  );
}

export async function ContactTimeline({
  contactId,
  companyId,
  compact = false,
}: {
  contactId: string;
  companyId?: string | null;
  compact?: boolean;
}) {
  const [events, permissions] = await Promise.all([
    listTimelineForContact(contactId),
    timelinePermissions(),
  ]);
  return (
    <Timeline
      compact={compact}
      events={events}
      contactId={contactId}
      companyId={companyId}
      {...permissions}
    />
  );
}

export async function DealTimeline({
  dealId,
  contactId,
  companyId,
  compact = false,
}: {
  dealId: string;
  contactId?: string | null;
  companyId?: string | null;
  compact?: boolean;
}) {
  const [events, permissions] = await Promise.all([
    listTimelineForDeal(dealId),
    timelinePermissions(),
  ]);
  return (
    <Timeline
      compact={compact}
      events={events}
      dealId={dealId}
      contactId={contactId}
      companyId={companyId}
      {...permissions}
    />
  );
}
