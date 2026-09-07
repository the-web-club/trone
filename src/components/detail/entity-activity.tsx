import { TaskSection } from "@/components/task/task-section";
import { Timeline } from "@/components/timeline/timeline";
import { WorkLogSection } from "@/components/worklog/work-log-section";
import { listActiveAssignees, listOpenTasksForEntity } from "@/lib/task-service";
import {
  listTimelineForCompany,
  listTimelineForContact,
  listTimelineForDeal,
} from "@/lib/timeline-service";
import { listOrdersForWorkLog, listWorkLogs } from "@/lib/worklog-service";

export async function EntityTasks({
  currentUserId,
  dealId,
  contactId,
  companyId,
  compact = false,
}: {
  currentUserId: string;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  compact?: boolean;
}) {
  const [tasks, assignees] = await Promise.all([
    listOpenTasksForEntity({
      dealId: dealId ?? undefined,
      contactId: contactId ?? undefined,
      companyId: companyId ?? undefined,
    }),
    listActiveAssignees(),
  ]);

  return (
    <TaskSection
      compact={compact}
      tasks={tasks}
      currentUserId={currentUserId}
      assignees={assignees}
      dealId={dealId}
      contactId={contactId}
      companyId={companyId}
    />
  );
}

export async function CompanyTimeline({ companyId }: { companyId: string }) {
  const events = await listTimelineForCompany(companyId);
  return <Timeline events={events} companyId={companyId} />;
}

export async function ContactTimeline({
  contactId,
  companyId,
}: {
  contactId: string;
  companyId?: string | null;
}) {
  const events = await listTimelineForContact(contactId);
  return (
    <Timeline events={events} contactId={contactId} companyId={companyId} />
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
  const events = await listTimelineForDeal(dealId);
  return (
    <Timeline
      compact={compact}
      events={events}
      dealId={dealId}
      contactId={contactId}
      companyId={companyId}
    />
  );
}

export async function CompanyWorkLogs({
  companyId,
  companyName,
  currentUserId,
  isAdmin,
}: {
  companyId: string;
  companyName: string;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [logs, orders] = await Promise.all([
    listWorkLogs({ companyId }),
    listOrdersForWorkLog(undefined, companyId),
  ]);

  return (
    <WorkLogSection
      title="Werkzaamheden"
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      defaultCompanyId={companyId}
      lockCompany
      companies={[{ id: companyId, name: companyName }]}
      orders={orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        companyId: order.companyId,
        companyName,
      }))}
      logs={logs}
    />
  );
}
