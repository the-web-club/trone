import "server-only";

import { formatDate } from "@/lib/format";
import { getPrismaClient } from "@/lib/db";
import { companyPath, dealPath } from "@/lib/paths";
import { effectiveDealValue } from "@/lib/deal-value";
import { isAutoHot, isFollowUpRipe, isStale } from "@/lib/opportunity-classify";
import { getThresholds } from "@/lib/settings-service";

export type OpportunityItem = {
  id: string;
  title: string;
  reason: string;
  href: string;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  hot?: boolean;
};

export type OpportunityBoard = {
  stale: OpportunityItem[];
  followUp: OpportunityItem[];
  hot: OpportunityItem[];
  hotSuggestions: OpportunityItem[];
};

function latestDate(dates: Array<Date | null | undefined>): Date | null {
  const valid = dates.filter((value): value is Date => value instanceof Date);
  if (valid.length === 0) return null;
  return valid.reduce((latest, value) => (value > latest ? value : latest));
}

export async function listOpportunities(): Promise<OpportunityBoard> {
  const prisma = getPrismaClient();
  const thresholds = await getThresholds();
  const now = new Date();

  const [deals, companies] = await Promise.all([
    prisma.deal.findMany({
      where: { status: "OPEN" },
      select: {
        id: true,
        slug: true,
        title: true,
        contactId: true,
        companyId: true,
        valueEstimate: true,
        isHot: true,
        status: true,
        createdAt: true,
        stage: { select: { name: true, isWon: true, isLost: true } },
        company: { select: { id: true, slug: true, name: true } },
        quotes: { select: { total: true, status: true } },
        timelineEvents: {
          select: { occurredAt: true },
          orderBy: { occurredAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.company.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        orders: {
          select: { orderedAt: true, orderNumber: true },
          orderBy: { orderedAt: "desc" },
          take: 1,
        },
        deals: {
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        quotes: {
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
  ]);

  const stale: OpportunityItem[] = [];
  const hot: OpportunityItem[] = [];
  const hotSuggestions: OpportunityItem[] = [];

  for (const deal of deals) {
    if (deal.stage.isWon || deal.stage.isLost) continue;
    const lastActivityAt = deal.timelineEvents[0]?.occurredAt ?? deal.createdAt;
    const valueEstimate = effectiveDealValue(
      deal.valueEstimate == null ? null : Number(deal.valueEstimate),
      deal.quotes,
    );
    const title = deal.company
      ? `${deal.title} · ${deal.company.name}`
      : deal.title;

    if (deal.isHot) {
      hot.push({
        id: `hot-${deal.id}`,
        title,
        reason: "Handmatig gemarkeerd als hot",
        href: dealPath(deal),
        dealId: deal.id,
        contactId: deal.contactId,
        companyId: deal.companyId,
        hot: true,
      });
    } else if (
      isAutoHot({
        isHot: deal.isHot,
        status: deal.status,
        valueEstimate,
        lastActivityAt: deal.timelineEvents[0]?.occurredAt ?? null,
        hotWaarde: thresholds.hotWaarde,
        now,
      })
    ) {
      hotSuggestions.push({
        id: `hot-suggest-${deal.id}`,
        title,
        reason: `Recente activiteit en waarde vanaf €${thresholds.hotWaarde}`,
        href: dealPath(deal),
        dealId: deal.id,
        contactId: deal.contactId,
        companyId: deal.companyId,
        hot: true,
      });
    } else if (isStale(lastActivityAt, thresholds.stilDagen, now)) {
      stale.push({
        id: `stale-${deal.id}`,
        title,
        reason: `Geen activiteit sinds ${formatDate(lastActivityAt)} (${deal.stage.name})`,
        href: dealPath(deal),
        dealId: deal.id,
        contactId: deal.contactId,
        companyId: deal.companyId,
      });
    }
  }

  const followUp: OpportunityItem[] = [];
  for (const company of companies) {
    const lastOrder = company.orders[0];
    if (!lastOrder) continue;
    const lastNewDealOrQuoteAt = latestDate([
      ...company.deals.map((deal) => deal.createdAt),
      ...company.quotes.map((quote) => quote.createdAt),
    ]);
    if (
      !isFollowUpRipe({
        orderedAt: lastOrder.orderedAt,
        opvolgingMaanden: thresholds.opvolgingMaanden,
        lastNewDealOrQuoteAt,
        now,
      })
    ) {
      continue;
    }
    followUp.push({
      id: `follow-${company.id}`,
      title: company.name,
      reason: `Laatste order ${lastOrder.orderNumber} op ${formatDate(lastOrder.orderedAt)}`,
      href: companyPath(company),
      companyId: company.id,
    });
  }

  return { stale, followUp, hot, hotSuggestions };
}
