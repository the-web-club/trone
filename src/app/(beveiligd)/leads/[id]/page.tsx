import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateDealAction } from "@/app/(beveiligd)/actions/deal-actions";
import { DealForm } from "@/components/deal/deal-form";
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
import { listCompanies } from "@/lib/company-service";
import { listContacts } from "@/lib/contact-service";
import { getDeal, listDealStages, listLeadSources } from "@/lib/deal-service";
import { isAppError } from "@/lib/errors";
import { listTimelineForDeal } from "@/lib/timeline-service";
import { formatDate, formatEuroExact, formatPersonName } from "@/lib/format";
import { orderStatusLabels } from "@/lib/orders-query";
import { quoteStatusLabels, quoteStatusTones } from "@/lib/quote-validation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const deal = await getDeal(id);
    return { title: deal.title };
  } catch {
    return { title: "Lead" };
  }
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await getDeal(id).catch((error) => {
    if (isAppError(error) && error.status === 404) notFound();
    throw error;
  });

  const [stages, sources, companies, contacts, events] = await Promise.all([
    listDealStages(),
    listLeadSources(),
    listCompanies(),
    listContacts(),
    listTimelineForDeal(deal.id),
  ]);
  const contactName = deal.contact
    ? formatPersonName(deal.contact.firstName, deal.contact.lastName)
    : null;

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
                <Link
                  href={`/bedrijven/${deal.company.id}`}
                  className="hover:underline"
                >
                  {deal.company.name}
                </Link>
              </>
            ) : null}
            {contactName && deal.contact ? (
              <>
                {" · "}
                <Link
                  href={`/contacten/${deal.contact.id}`}
                  className="hover:underline"
                >
                  {contactName}
                </Link>
              </>
            ) : null}
          </>
        }
        actions={
          <>
            <Link
              href={
                deal.companyId
                  ? `/offertes/nieuw?deal=${deal.id}&company=${deal.companyId}`
                  : `/offertes/nieuw?deal=${deal.id}`
              }
              className={pageActionPrimaryClassName()}
            >
              Nieuwe offerte
            </Link>
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
          contacts={contacts.map((contact) => ({
            id: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            companyId: contact.companyId,
          }))}
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
                    href={
                      deal.companyId
                        ? `/offertes/nieuw?deal=${deal.id}&company=${deal.companyId}`
                        : `/offertes/nieuw?deal=${deal.id}`
                    }
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
                        href={`/offertes/${quote.id}`}
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
                              href={`/orders/${order.id}`}
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

      <Timeline
        events={events}
        dealId={deal.id}
        contactId={deal.contactId}
        companyId={deal.companyId}
      />
    </div>
  );
}
