import { CollapsibleWorkLogForm } from "@/components/worklog/collapsible-work-log-form";
import { WorkLogForm } from "@/components/worklog/work-log-form";
import { WorkLogList, type WorkLogListItem } from "@/components/worklog/work-log-list";
import type { WorkLogCompanyOption, WorkLogOrderOption } from "@/components/worklog/work-log-link-fields";
import type { WorkLogCategory } from "@/lib/worklog-validation";

type WorkLogRecord = {
  id: string;
  description: string;
  occurredAt: Date;
  category: WorkLogCategory;
  durationMinutes: number | null;
  userId: string;
  companyId: string | null;
  orderId: string | null;
  user: {
    id: string;
    name: string;
    image?: string | null;
    slug?: string | null;
  };
  company: { id: string; slug: string; name: string } | null;
  order: { id: string; orderNumber: string } | null;
};

export function WorkLogSection({
  logs,
  companies,
  orders,
  currentUserId,
  isAdmin,
  defaultCompanyId,
  defaultOrderId,
  lockCompany,
  lockOrder,
  title = "Werkzaamheden",
  compact = false,
}: {
  logs: WorkLogRecord[];
  companies: WorkLogCompanyOption[];
  orders: WorkLogOrderOption[];
  currentUserId: string;
  isAdmin: boolean;
  defaultCompanyId?: string;
  defaultOrderId?: string;
  lockCompany?: boolean;
  lockOrder?: boolean;
  title?: string;
  compact?: boolean;
}) {
  const form = compact ? (
    <CollapsibleWorkLogForm
      companies={companies}
      orders={orders}
      defaultCompanyId={defaultCompanyId}
      defaultOrderId={defaultOrderId}
      lockCompany={lockCompany}
      lockOrder={lockOrder}
    />
  ) : (
    <div className="rounded-md border border-border bg-surface p-3">
      <WorkLogForm
        companies={companies}
        orders={orders}
        defaultCompanyId={defaultCompanyId}
        defaultOrderId={defaultOrderId}
        lockCompany={lockCompany}
        lockOrder={lockOrder}
      />
    </div>
  );

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-label font-medium tracking-wide text-fg-muted uppercase">
        {title}
      </h2>
      {form}
      {logs.length === 0 ? (
        compact ? null : (
          <WorkLogList
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            logs={[]}
          />
        )
      ) : (
        <WorkLogList
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          logs={logs.map((log) => ({
            id: log.id,
            description: log.description,
            occurredAt: log.occurredAt.toISOString(),
            category: log.category,
            durationMinutes: log.durationMinutes,
            userId: log.userId,
            userName: log.user.name,
            userImage: log.user.image ?? null,
            userSlug: log.user.slug ?? null,
            companyId: log.companyId,
            company: log.company,
            orderId: log.orderId,
            orderNumber: log.order?.orderNumber ?? null,
          })) as WorkLogListItem[]}
        />
      )}
    </section>
  );
}
