import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusForm } from "@/components/order/order-status-form";
import { QuoteLines } from "@/components/quote/quote-lines";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { WorkLogSection } from "@/components/worklog/work-log-section";
import { isAdminSession, requireSession } from "@/lib/auth-session";
import { isAppError } from "@/lib/errors";
import { formatDate, formatPersonName } from "@/lib/format";
import { getOrder } from "@/lib/order-service";
import { orderStatusLabels, orderStatusTones } from "@/lib/orders-query";
import { listWorkLogs } from "@/lib/worklog-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const order = await getOrder(id);
    return { title: order.orderNumber };
  } catch {
    return { title: "Order" };
  }
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const order = await getOrder(id).catch((error) => {
    if (isAppError(error) && error.status === 404) notFound();
    throw error;
  });
  const logs = await listWorkLogs({ orderId: id });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={order.orderNumber}
        description={
          <>
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
            {order.contact
              ? ` · ${formatPersonName(order.contact.firstName, order.contact.lastName)}`
              : null}
            {order.quote ? (
              <>
                {" · "}
                <Link
                  href={`/offertes/${order.quote.id}`}
                  className="hover:underline"
                >
                  {order.quote.quoteNumber}
                </Link>
              </>
            ) : null}
            {order.deal ? (
              <>
                {" · "}
                <Link href={`/leads/${order.deal.id}`} className="hover:underline">
                  {order.deal.title}
                </Link>
              </>
            ) : null}
            {` · ${formatDate(order.createdAt)}`}
          </>
        }
        actions={
          <Badge tone={orderStatusTones[order.status]}>
            {orderStatusLabels[order.status]}
          </Badge>
        }
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-md font-medium text-fg">Productiestatus</h2>
        <OrderStatusForm orderId={order.id} status={order.status} />
      </section>

      <QuoteLines
        items={order.items}
        vatRate={Number(order.company.vatRate)}
        subtotal={Number(order.subtotal)}
        discountTotal={Number(order.discountTotal)}
        total={Number(order.total)}
      />

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
