import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select";
import { WorkLogForm } from "@/components/worklog/work-log-form";
import { WorkLogList } from "@/components/worklog/work-log-list";
import { isAdminSession, requireSession } from "@/lib/auth-session";
import { listCompaniesForSelect } from "@/lib/company-service";
import { listUsersForSelect } from "@/lib/user-service";
import { listOrdersForWorkLog, listWorkLogs } from "@/lib/worklog-service";
import {
  parseWorkLogFilters,
  workLogCategories,
  workLogCategoryLabels,
} from "@/lib/worklog-validation";

export const metadata: Metadata = { title: "Logboek" };

export default async function LogboekPage({
  searchParams,
}: {
  searchParams: Promise<{
    userId?: string;
    category?: string;
    from?: string;
    to?: string;
    company?: string;
  }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const filters = parseWorkLogFilters({
    userId: params.userId,
    category: params.category,
    from: params.from,
    to: params.to,
    companyId: params.company,
  });

  const [logs, users, companies, orders] = await Promise.all([
    listWorkLogs(filters),
    listUsersForSelect(),
    listCompaniesForSelect(),
    listOrdersForWorkLog(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Logboek"
        description="Snel vastleggen wat je hebt gedaan. Alleen de omschrijving is verplicht."
      />

      <div className="rounded-md border border-border bg-surface p-3">
        <WorkLogForm
          companies={companies.map((company) => ({
            id: company.id,
            name: company.name,
          }))}
          orders={orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            companyId: order.companyId,
            companyName: order.company.name,
          }))}
        />
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <SelectMenu
          name="userId"
          defaultValue={filters.userId ?? ""}
          className="max-w-48"
          aria-label="Filter op medewerker"
          searchPlaceholder="Zoek een medewerker…"
          items={[
            { value: "", label: "Alle medewerkers" },
            ...users.map((user) => ({
              value: user.id,
              label: user.name,
            })),
          ]}
        />
        <SelectMenu
          name="category"
          defaultValue={filters.category ?? ""}
          className="max-w-44"
          aria-label="Filter op categorie"
          searchPlaceholder="Zoek een categorie…"
          items={[
            { value: "", label: "Alle categorieën" },
            ...workLogCategories.map((category) => ({
              value: category,
              label: workLogCategoryLabels[category],
            })),
          ]}
        />
        <Input
          name="from"
          type="date"
          defaultValue={params.from ?? ""}
          inputSize="sm"
          aria-label="Van"
          className="w-36"
        />
        <Input
          name="to"
          type="date"
          defaultValue={params.to ?? ""}
          inputSize="sm"
          aria-label="Tot"
          className="w-36"
        />
        <Button type="submit" variant="secondary">
          Filteren
        </Button>
      </form>

      <WorkLogList
        currentUserId={session.user.id}
        isAdmin={isAdminSession(session)}
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
    </div>
  );
}
