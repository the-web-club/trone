import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderStatusForm } from "@/components/order/order-status-form";
import { QuoteLines } from "@/components/quote/quote-lines";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { WorkLogSection } from "@/components/worklog/work-log-section";
import { isAdminSession, requireSession } from "@/lib/auth-session";
import { isAppError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { getOrder } from "@/lib/order-service";
import { CompanyLink, ContactLink, DealLink } from "@/components/entity-links";
import { orderPath, quotePath } from "@/lib/paths";
import { orderStatusLabels, orderStatusTones } from "@/lib/orders-query";
import { listWorkLogs } from "@/lib/worklog-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const order = await getOrder(slug);
    return { title: order.orderNumber };
  } catch {
    return { title: "Order" };
  }
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireSession();
  const order = await getOrder(slug).catch((error) => {
    if (isAppError(error) && error.status === 404) notFound();
    throw error;
  });
  if (slug !== order.orderNumber) redirect(orderPath(order));
  const logs = await listWorkLogs({ orderId: order.id });

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
            <CompanyLink company={order.company} />
            {order.contact ? (
              <>
                {" · "}
                <ContactLink contact={order.contact} />
              </>
            ) : null}
            {order.quote ? (
              <>
                {" · "}
                <Link
                  href={quotePath(order.quote)}
                  className="hover:underline"
                >
                  {order.quote.quoteNumber}
                </Link>
              </>
            ) : null}
            {order.deal ? (
              <>
                {" · "}
                <DealLink deal={order.deal} />
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
