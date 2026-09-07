import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateDealAction } from "@/app/(beveiligd)/actions/deal-actions";
import { DealForm } from "@/components/deal/deal-form";
import { DealHotToggle } from "@/components/deal/deal-hot-toggle";
import { TaskSection } from "@/components/task/task-section";
import { Timeline } from "@/components/timeline/timeline";
import {
  PageHeader,
  pageActionPrimaryClassName,
} from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmptyRow,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { requireSession } from "@/lib/auth-session";
import { listCompanies } from "@/lib/company-service";
import { listContactsForSelect } from "@/lib/contact-service";
import { getDeal, listDealStages, listLeadSources } from "@/lib/deal-service";
import { isAppError } from "@/lib/errors";
import { listActiveAssignees, listOpenTasksForEntity } from "@/lib/task-service";
import { listTimelineForDeal } from "@/lib/timeline-service";
import {
  CompanyLink,
  ContactLink,
} from "@/components/entity-links";
import { formatDate, formatEuroExact } from "@/lib/format";
import { orderStatusLabels } from "@/lib/orders-query";
import {
  dealPath,
  newQuotePath,
  orderPath,
  quotePath,
} from "@/lib/paths";
import { quoteStatusLabels, quoteStatusTones } from "@/lib/quote-validation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const deal = await getDeal(slug);
    return { title: deal.title };
  } catch {
    return { title: "Lead" };
  }
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireSession();
  const deal = await getDeal(slug).catch((error) => {
    if (isAppError(error) && error.status === 404) notFound();
    throw error;
  });
  if (slug !== deal.slug) redirect(dealPath(deal));

  const [stages, sources, companies, contacts, events, tasks, assignees] =
    await Promise.all([
      listDealStages(),
      listLeadSources(),
      listCompanies(),
      listContactsForSelect(deal.companyId),
      listTimelineForDeal(deal.id),
      listOpenTasksForEntity({
        dealId: deal.id,
        contactId: deal.contactId ?? undefined,
        companyId: deal.companyId ?? undefined,
      }),
      listActiveAssignees(),
    ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={deal.title}
        description={
          <>
            <Link href="/leads" className="hover:underline">
              Terug naar de pijplijn
            </Link>
            {deal.company ? (
              <>
                {" · "}
                <CompanyLink company={deal.company} />
              </>
            ) : null}
            {deal.contact ? (
              <>
                {" · "}
                <ContactLink contact={deal.contact} />
              </>
            ) : null}
          </>
        }
        actions={
          <>
            <DealHotToggle dealId={deal.id} isHot={deal.isHot} />
            <Link
              href={newQuotePath({ deal, company: deal.company })}
              className={pageActionPrimaryClassName()}
            >
              Nieuwe offerte
            </Link>
            {deal.isHot ? <Badge tone="warning">Hot</Badge> : null}
            <Badge
              tone={
                deal.stage.isWon ? "success" : deal.stage.isLost ? "danger" : "info"
              }
            >
              {deal.stage.name}
            </Badge>
          </>
        }
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-md font-medium text-fg">Gegevens</h2>
        <DealForm
          action={updateDealAction}
          submitLabel="Wijzigingen opslaan"
          stages={stages}
          sources={sources}
          companies={companies.map((company) => ({
            id: company.id,
            name: company.name,
          }))}
          contacts={contacts}
          deal={{
            id: deal.id,
            title: deal.title,
            companyId: deal.companyId,
            contactId: deal.contactId,
            stageId: deal.stageId,
            sourceId: deal.sourceId,
            valueEstimate:
              deal.valueEstimate == null ? null : Number(deal.valueEstimate),
          }}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-md font-medium text-fg">Offertes en orders</h2>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Offerte</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Totaal</TableHeaderCell>
                <TableHeaderCell>Datum</TableHeaderCell>
                <TableHeaderCell>Order</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deal.quotes.length === 0 ? (
                <TableEmptyRow colSpan={5}>
                  Nog geen offertes bij deze lead.{" "}
                  <Link
                    href={newQuotePath({ deal, company: deal.company })}
                    className="text-fg hover:underline"
                  >
                    Nieuwe offerte
                  </Link>
                </TableEmptyRow>
              ) : (
                deal.quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell>
                      <Link
                        href={quotePath(quote)}
                        className="font-medium text-fg hover:underline"
                      >
                        {quote.quoteNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge tone={quoteStatusTones[quote.status]}>
                        {quoteStatusLabels[quote.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-fg-muted">
                      {formatEuroExact(Number(quote.total))}
                    </TableCell>
                    <TableCell className="text-fg-muted">
                      {formatDate(quote.createdAt)}
                    </TableCell>
                    <TableCell>
                      {quote.orders.length === 0 ? (
                        <span className="text-fg-muted">—</span>
                      ) : (
                        <span className="flex flex-col gap-1">
                          {quote.orders.map((order) => (
                            <Link
                              key={order.id}
                              href={orderPath(order)}
                              className="text-fg hover:underline"
                            >
                              {order.orderNumber}
                              <span className="ml-2 text-fg-muted">
                                {orderStatusLabels[order.status]}
                              </span>
                            </Link>
                          ))}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </section>

      <TaskSection
        tasks={tasks}
        currentUserId={session.user.id}
        assignees={assignees}
        dealId={deal.id}
        contactId={deal.contactId}
        companyId={deal.companyId}
      />

      <Timeline
        events={events}
        dealId={deal.id}
        contactId={deal.contactId}
        companyId={deal.companyId}
      />
    </div>
  );
}
