import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { WorkLogSection } from "@/components/worklog/work-log-section";
import { isAdminSession, requireSession } from "@/lib/auth-session";
import { isAppError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { getOrderForWorkLog, listWorkLogs } from "@/lib/worklog-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const order = await getOrderForWorkLog(id);
    return { title: order.orderNumber };
  } catch {
    return { title: "Order" };
  }
}

const orderStatusLabels: Record<string, string> = {
  NEW: "Nieuw",
  CONFIRMED: "Bevestigd",
  IN_PRODUCTION: "In productie",
  READY: "Gereed",
  SHIPPED: "Verzonden",
  DELIVERED: "Geleverd",
  CANCELLED: "Geannuleerd",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const order = await getOrderForWorkLog(id).catch((error) => {
    if (isAppError(error) && error.status === 404) notFound();
    throw error;
  });
  const logs = await listWorkLogs({ orderId: id });

  return (
    <div className="flex flex-col gap-8">
      <header className="page-header">
        <div className="page-header-copy">
          <h1 className="page-header-title">{order.orderNumber}</h1>
          <p className="page-header-description">
            <Link href="/orders" className="hover:underline">
              Terug naar orders
            </Link>
            {" · "}
            <Link
              href={`/bedrijven/${order.company.id}`}
              className="hover:underline"
            >
              {order.company.name}
            </Link>
            {" · "}
            {formatDate(order.createdAt)}
          </p>
        </div>
        <Badge>{orderStatusLabels[order.status] ?? order.status}</Badge>
      </header>

      <WorkLogSection
        title="Werkzaamheden"
        currentUserId={session.user.id}
        isAdmin={isAdminSession(session)}
        defaultCompanyId={order.companyId}
        defaultOrderId={order.id}
        lockCompany
        lockOrder
        companies={[{ id: order.company.id, name: order.company.name }]}
        orders={[
          {
            id: order.id,
            orderNumber: order.orderNumber,
            companyId: order.companyId,
            companyName: order.company.name,
          },
        ]}
        logs={logs}
      />
    </div>
  );
}
