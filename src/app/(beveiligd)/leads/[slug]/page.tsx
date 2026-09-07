import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { LeadDetail } from "@/components/deal/lead-detail";
import { LeadQuotesTable } from "@/components/deal/lead-quotes-table";
import {
  DealTimeline,
  EntityTasks,
} from "@/components/detail/entity-activity";
import {
  DetailTaskSkeleton,
  DetailTimelineSkeleton,
} from "@/components/detail/detail-skeletons";
import { isAdminSession, requireSession } from "@/lib/auth-session";
import { listCompaniesForSelect } from "@/lib/company-service";
import { listContactsForSelect } from "@/lib/contact-service";
import { getDeal, listDealStages, listLeadSources } from "@/lib/deal-service";
import { isAppError } from "@/lib/errors";
import { effectiveDealValue, sumActiveQuoteTotals } from "@/lib/deal-value";
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
  const companiesPromise = listCompaniesForSelect();
  const sourcesPromise = listLeadSources();
  const [session, deal, stages] = await Promise.all([
    requireSession(),
    getDeal(slug).catch((error) => {
      if (isAppError(error) && error.status === 404) notFound();
      throw error;
    }),
    listDealStages(),
  ]);
  if (slug !== deal.slug) redirect(dealPath(deal));

  const relationOptions = Promise.all([
    sourcesPromise,
    companiesPromise,
    listContactsForSelect(deal.companyId),
  ]).then(([sources, companies, contacts]) => ({
    sources: sources.map((source) => ({ id: source.id, name: source.name })),
    companies,
    contacts,
  }));

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
        quotedTotal: sumActiveQuoteTotals(deal.quotes),
        valueEstimateLabel: formatEuro(
          effectiveDealValue(
            deal.valueEstimate == null ? null : Number(deal.valueEstimate),
            deal.quotes,
          ),
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
      relationOptions={relationOptions}
      isAdmin={isAdminSession(session)}
      quotes={
        <LeadQuotesTable
          quotes={deal.quotes.map((quote) => ({
            id: quote.id,
            quoteNumber: quote.quoteNumber,
            status: quote.status,
            total: Number(quote.total),
            createdAt: quote.createdAt.toISOString(),
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
          <Suspense fallback={<DetailTimelineSkeleton compact />}>
            <DealTimeline
              compact
              dealId={deal.id}
              contactId={deal.contactId}
              companyId={deal.companyId}
            />
          </Suspense>
          <Suspense fallback={<DetailTaskSkeleton compact />}>
            <EntityTasks
              compact
              currentUserId={session.user.id}
              dealId={deal.id}
              contactId={deal.contactId}
              companyId={deal.companyId}
            />
          </Suspense>
        </>
      }
    />
  );
}
