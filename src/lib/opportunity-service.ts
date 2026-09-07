import "server-only";

import { formatDate, formatPersonName } from "@/lib/format";
import { getPrismaClient } from "@/lib/db";
import { companyPath, contactPath, dealPath } from "@/lib/paths";
import {
  isAutoHot,
  isDueTodayOrOverdue,
  isFollowUpRipe,
  isStale,
} from "@/lib/opportunity-classify";
import { getThresholds } from "@/lib/settings-service";

export type OpportunityItem = {
  id: string;
  title: string;
  reason: string;
  href: string;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
};

export type OpportunityBoard = {
  stale: OpportunityItem[];
  followUp: OpportunityItem[];
  hot: OpportunityItem[];
  hotSuggestions: OpportunityItem[];
  dueActions: OpportunityItem[];
};

function latestDate(dates: Array<Date | null | undefined>): Date | null {
  const valid = dates.filter((value): value is Date => value instanceof Date);
  if (valid.length === 0) return null;
  return valid.reduce((latest, value) => (value > latest ? value : latest));
}

export async function listOpportunities(
  viewerUserId: string,
): Promise<OpportunityBoard> {
  const prisma = getPrismaClient();
  const thresholds = await getThresholds();
  const now = new Date();

  const [deals, companies, tasks] = await Promise.all([
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
    prisma.task.findMany({
      where: {
        status: "OPEN",
        assigneeUserId: viewerUserId,
        dueAt: { not: null },
      },
      include: {
        deal: { select: { id: true, slug: true, title: true } },
        contact: { select: { id: true, slug: true, firstName: true, lastName: true } },
        company: { select: { id: true, slug: true, name: true } },
      },
    }),
  ]);

  const stale: OpportunityItem[] = [];
  const hot: OpportunityItem[] = [];
  const hotSuggestions: OpportunityItem[] = [];

  for (const deal of deals) {
    if (deal.stage.isWon || deal.stage.isLost) continue;
    const lastActivityAt = deal.timelineEvents[0]?.occurredAt ?? deal.createdAt;
    const valueEstimate =
      deal.valueEstimate == null ? null : Number(deal.valueEstimate);
    const title = deal.company
      ? `${deal.title} · ${deal.company.name}`
      : deal.title;

    if (isStale(lastActivityAt, thresholds.stilDagen, now)) {
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

    if (deal.isHot) {
      hot.push({
        id: `hot-${deal.id}`,
        title,
        reason: "Handmatig gemarkeerd als hot",
        href: dealPath(deal),
        dealId: deal.id,
        contactId: deal.contactId,
        companyId: deal.companyId,
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

  const dueActions: OpportunityItem[] = [];
  for (const task of tasks) {
    if (!task.dueAt || !isDueTodayOrOverdue(task.dueAt, now)) continue;
    const linked = task.deal
      ? { href: dealPath(task.deal), label: task.deal.title }
      : task.contact
        ? {
            href: contactPath(task.contact),
            label: formatPersonName(
              task.contact.firstName,
              task.contact.lastName,
            ),
          }
        : task.company
          ? { href: companyPath(task.company), label: task.company.name }
          : { href: "/taken", label: "Taak" };
    dueActions.push({
      id: `task-${task.id}`,
      title: `${task.title} · ${linked.label}`,
      reason: `Uiterlijk ${formatDate(task.dueAt)}`,
      href: linked.href,
      dealId: task.dealId,
      contactId: task.contactId,
      companyId: task.companyId,
    });
  }

  return { stale, followUp, hot, hotSuggestions, dueActions };
}
