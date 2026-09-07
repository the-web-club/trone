import { WorkLogForm } from "@/components/worklog/work-log-form";
import { WorkLogList } from "@/components/worklog/work-log-list";
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
  user: { id: string; name: string };
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
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-md font-medium text-fg">{title}</h2>
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
          companyId: log.companyId,
          company: log.company,
          orderId: log.orderId,
          orderNumber: log.order?.orderNumber ?? null,
        }))}
      />
    </section>
  );
}
