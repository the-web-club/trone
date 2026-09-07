import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LeadDetail } from "@/components/deal/lead-detail";
import { LeadQuotesTable } from "@/components/deal/lead-quotes-table";
import { TaskSection } from "@/components/task/task-section";
import { Timeline } from "@/components/timeline/timeline";
import { requireSession } from "@/lib/auth-session";
import { listCompanies } from "@/lib/company-service";
import { listContactsForSelect } from "@/lib/contact-service";
import { getDeal, listDealStages, listLeadSources } from "@/lib/deal-service";
import { isAppError } from "@/lib/errors";
import { listActiveAssignees, listOpenTasksForEntity } from "@/lib/task-service";
import { listTimelineForDeal } from "@/lib/timeline-service";
import { formatEuro } from "@/lib/format";
import { dealPath } from "@/lib/paths";

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
    <LeadDetail
      deal={{
        id: deal.id,
        slug: deal.slug,
        title: deal.title,
        isHot: deal.isHot,
        companyId: deal.companyId,
        contactId: deal.contactId,
        stageId: deal.stageId,
        sourceId: deal.sourceId,
        valueEstimate:
          deal.valueEstimate == null ? null : Number(deal.valueEstimate),
        valueEstimateLabel: formatEuro(
          deal.valueEstimate == null ? null : Number(deal.valueEstimate),
        ) ?? "—",
        company: deal.company,
        contact: deal.contact,
        stage: {
          id: deal.stage.id,
          name: deal.stage.name,
          isWon: deal.stage.isWon,
          isLost: deal.stage.isLost,
        },
      }}
      stages={stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        isWon: stage.isWon,
        isLost: stage.isLost,
      }))}
      sources={sources.map((source) => ({
        id: source.id,
        name: source.name,
      }))}
      companies={companies.map((company) => ({
        id: company.id,
        slug: company.slug,
        name: company.name,
      }))}
      contacts={contacts}
      quotes={
        <LeadQuotesTable
          quotes={deal.quotes.map((quote) => ({
            id: quote.id,
            quoteNumber: quote.quoteNumber,
            status: quote.status,
            total: Number(quote.total),
            createdAt: quote.createdAt,
            orders: quote.orders.map((order) => ({
              id: order.id,
              orderNumber: order.orderNumber,
              status: order.status,
            })),
          }))}
        />
      }
      activity={
        <>
          <Timeline
            compact
            events={events}
            dealId={deal.id}
            contactId={deal.contactId}
            companyId={deal.companyId}
          />
          <TaskSection
            compact
            tasks={tasks}
            currentUserId={session.user.id}
            assignees={assignees}
            dealId={deal.id}
            contactId={deal.contactId}
            companyId={deal.companyId}
          />
        </>
      }
    />
  );
}
