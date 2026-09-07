import "server-only";

import { cache } from "react";
import type { DealStatus, Prisma } from "@/generated/prisma/client";
import {
  endExclusiveOfCalendarDate,
  normalizeDateOnlyInput,
  parseAmountInput,
  startOfCalendarDate,
} from "@/lib/date-input";
import { nextDealSlug } from "@/lib/entity-slug";
import { AppError } from "@/lib/errors";
import { createId, whereIdOrSlug } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import { getContactCompanyId } from "@/lib/contact-company";
import {
  assertDealContactCompany,
  type DealActivityInput,
  type DealInput,
} from "@/lib/deal-validation";
import { logEvent } from "@/lib/timeline-service";
import type {
  DealDateField,
  DealSort,
  DealStatusFilter,
} from "@/lib/deals-query";
import {
  effectiveDealValue,
  sumActiveQuoteTotals,
} from "@/lib/deal-value";

export const listDealStages = cache(
  async function listDealStages() {
    const prisma = getPrismaClient();
    return prisma.dealStage.findMany({ orderBy: { sortOrder: "asc" } });
  },
);

export const listLeadSources = cache(
  async function listLeadSources() {
    const prisma = getPrismaClient();
    return prisma.leadSource.findMany({ orderBy: { name: "asc" } });
  },
);

export async function listDealsForSelect(companyId?: string | null) {
  const prisma = getPrismaClient();
  const trimmed = companyId?.trim();
  return prisma.deal.findMany({
    where: trimmed ? { companyId: trimmed } : {},
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, companyId: true },
  });
}

export type DealListFilters = {
  zoeken?: string;
  stageId?: string;
  sourceId?: string;
  eigenaar?: string;
  status?: DealStatusFilter;
  waardeMin?: string | number | null;
  waardeMax?: string | number | null;
  van?: string;
  tot?: string;
  datumveld?: DealDateField;
  sortering?: DealSort;
  page?: number;
  pageSize?: number;
};

const dealListSelect = {
  id: true,
  slug: true,
  title: true,
  companyId: true,
  contactId: true,
  stageId: true,
  sourceId: true,
  ownerUserId: true,
  isHot: true,
  valueEstimate: true,
  status: true,
  expectedClose: true,
  createdAt: true,
  company: { select: { id: true, slug: true, name: true } },
  contact: { select: { id: true, slug: true, firstName: true, lastName: true } },
  stage: { select: { id: true, name: true, isWon: true, isLost: true } },
  source: { select: { id: true, name: true } },
  quotes: {
    orderBy: { updatedAt: "desc" as const },
    select: { id: true, quoteNumber: true, status: true, total: true },
  },
} satisfies Prisma.DealSelect;

export const DEAL_LIST_PAGE_SIZE = 25;
const KANBAN_LIST_CAP = 1000;
const DEAL_CSV_EXPORT_CAP = 5000;

function normalizeSearch(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toAmount(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  return parseAmountInput(value);
}

function statusFilterToEnum(
  status: DealStatusFilter | undefined,
): DealStatus | null {
  if (status === "open") return "OPEN";
  if (status === "won") return "WON";
  if (status === "lost") return "LOST";
  return null;
}

/**
 * Shared where for list, kanban, facets and export.
 * Owner-scope ("aan mij") is always the first AND clause.
 */
export function buildDealListWhere(
  filters: DealListFilters,
  currentUserId?: string,
): Prisma.DealWhereInput {
  const and: Prisma.DealWhereInput[] = [];

  const eigenaar = filters.eigenaar?.trim() || "alle";
  if (eigenaar === "aan-mij") {
    and.push({ ownerUserId: currentUserId ?? "__no_match__" });
  } else if (eigenaar === "niet-toegewezen") {
    and.push({ ownerUserId: null });
  } else if (eigenaar !== "alle") {
    and.push({ ownerUserId: eigenaar });
  }

  const search = normalizeSearch(filters.zoeken);
  if (search) {
    and.push({
      OR: [
        { title: { contains: search } },
        { company: { name: { contains: search } } },
        { contact: { firstName: { contains: search } } },
        { contact: { lastName: { contains: search } } },
      ],
    });
  }

  if (filters.stageId) {
    and.push({ stageId: filters.stageId });
  }

  if (filters.sourceId === "geen") {
    and.push({ sourceId: null });
  } else if (filters.sourceId) {
    and.push({ sourceId: filters.sourceId });
  }

  const status = statusFilterToEnum(filters.status);
  if (status) {
    and.push({ status });
  }

  const waardeMin = toAmount(filters.waardeMin);
  const waardeMax = toAmount(filters.waardeMax);
  if (waardeMin != null || waardeMax != null) {
    const valueEstimate: Prisma.DecimalFilter = {};
    if (waardeMin != null) valueEstimate.gte = waardeMin;
    if (waardeMax != null) valueEstimate.lte = waardeMax;
    and.push({ valueEstimate });
  }

  const van = normalizeDateOnlyInput(filters.van);
  const tot = normalizeDateOnlyInput(filters.tot);
  if (van || tot) {
    const field = filters.datumveld === "verwacht" ? "expectedClose" : "createdAt";
    const range: Prisma.DateTimeFilter = {};
    if (van) range.gte = startOfCalendarDate(van);
    if (tot) range.lt = endExclusiveOfCalendarDate(tot);
    and.push({ [field]: range });
  }

  return and.length > 0 ? { AND: and } : {};
}

function buildDealOrderBy(
  sortering: DealSort | null | undefined,
): Prisma.DealOrderByWithRelationInput[] {
  switch (sortering) {
    case "oudste":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "gewijzigd":
      return [{ updatedAt: "desc" }, { id: "desc" }];
    case "nieuwste":
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

export type DealListItem = Prisma.DealGetPayload<{
  select: typeof dealListSelect;
}>;

export async function listDeals(
  filters: DealListFilters = {},
  currentUserId?: string,
): Promise<{
  items: DealListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const prisma = getPrismaClient();
  const pageSize = Math.min(
    Math.max(filters.pageSize ?? DEAL_LIST_PAGE_SIZE, 1),
    100,
  );
  const page = Math.max(filters.page ?? 1, 1);
  const where = buildDealListWhere(filters, currentUserId);

  const [total, items] = await Promise.all([
    prisma.deal.count({ where }),
    prisma.deal.findMany({
      where,
      select: dealListSelect,
      orderBy: buildDealOrderBy(filters.sortering),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { items, total, page, pageSize };
}

export async function listAllDeals(
  filters: Omit<DealListFilters, "page" | "pageSize"> = {},
  currentUserId?: string,
  options?: { take?: number },
): Promise<{ items: DealListItem[]; total: number; capped: boolean }> {
  const prisma = getPrismaClient();
  const take = Math.min(Math.max(options?.take ?? KANBAN_LIST_CAP, 1), 10_000);
  const where = buildDealListWhere(filters, currentUserId);

  const [total, items] = await Promise.all([
    prisma.deal.count({ where }),
    prisma.deal.findMany({
      where,
      select: dealListSelect,
      orderBy: buildDealOrderBy(filters.sortering),
      take,
    }),
  ]);

  return { items, total, capped: total > items.length };
}

export type DealTeamMember = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  slug: string | null;
};

export async function listDealTeamMembers(): Promise<DealTeamMember[]> {
  const prisma = getPrismaClient();
  return prisma.user.findMany({
    where: { OR: [{ banned: false }, { banned: null }] },
    select: { id: true, name: true, email: true, image: true, slug: true },
    orderBy: { name: "asc" },
  });
}

export type DealFilterFacets = {
  stageTotal: number;
  byStage: Array<{ stageId: string; count: number }>;
  sourceTotal: number;
  unassignedSource: number;
  bySource: Array<{ sourceId: string; count: number }>;
  ownerTotal: number;
  unassignedOwner: number;
  assignedToMe: number;
  byOwner: Array<{ userId: string; count: number }>;
  statusTotal: number;
  byStatus: Partial<Record<DealStatus, number>>;
};

/**
 * Facet counts for the leads filter bar.
 * Each dimension ignores its own filter so counts stay meaningful.
 * Four groupBy queries; totals/unassigned are derived from the groups.
 */
export async function getDealFilterFacets(
  filters: DealListFilters = {},
  currentUserId?: string,
): Promise<DealFilterFacets> {
  const prisma = getPrismaClient();

  const stageWhere = buildDealListWhere(
    { ...filters, stageId: undefined },
    currentUserId,
  );
  const sourceWhere = buildDealListWhere(
    { ...filters, sourceId: undefined },
    currentUserId,
  );
  const ownerWhere = buildDealListWhere(
    { ...filters, eigenaar: "alle" },
    currentUserId,
  );
  const statusWhere = buildDealListWhere(
    { ...filters, status: "alle" },
    currentUserId,
  );

  const [stageGroups, sourceGroups, ownerGroups, statusGroups] =
    await Promise.all([
      prisma.deal.groupBy({
        by: ["stageId"],
        where: stageWhere,
        _count: { _all: true },
      }),
      prisma.deal.groupBy({
        by: ["sourceId"],
        where: sourceWhere,
        _count: { _all: true },
      }),
      prisma.deal.groupBy({
        by: ["ownerUserId"],
        where: ownerWhere,
        _count: { _all: true },
      }),
      prisma.deal.groupBy({
        by: ["status"],
        where: statusWhere,
        _count: { _all: true },
      }),
    ]);

  const byStatus: Partial<Record<DealStatus, number>> = {};
  for (const group of statusGroups) {
    byStatus[group.status] = group._count._all;
  }

  const unassignedSource =
    sourceGroups.find((group) => group.sourceId == null)?._count._all ?? 0;
  const unassignedOwner =
    ownerGroups.find((group) => group.ownerUserId == null)?._count._all ?? 0;

  return {
    stageTotal: sumGroupCounts(stageGroups),
    byStage: stageGroups.map((group) => ({
      stageId: group.stageId,
      count: group._count._all,
    })),
    sourceTotal: sumGroupCounts(sourceGroups),
    unassignedSource,
    bySource: sourceGroups.flatMap((group) =>
      group.sourceId
        ? [{ sourceId: group.sourceId, count: group._count._all }]
        : [],
    ),
    ownerTotal: sumGroupCounts(ownerGroups),
    unassignedOwner,
    assignedToMe: currentUserId
      ? (ownerGroups.find((group) => group.ownerUserId === currentUserId)
          ?._count._all ?? 0)
      : 0,
    byOwner: ownerGroups.flatMap((group) =>
      group.ownerUserId
        ? [{ userId: group.ownerUserId, count: group._count._all }]
        : [],
    ),
    statusTotal: sumGroupCounts(statusGroups),
    byStatus,
  };
}

function sumGroupCounts(groups: Array<{ _count: { _all: number } }>): number {
  return groups.reduce((sum, group) => sum + group._count._all, 0);
}

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function exportDealsCsv(
  filters: Omit<DealListFilters, "page" | "pageSize">,
  currentUserId?: string,
): Promise<{ csv: string; filename: string; total: number; capped: boolean }> {
  const { items, total, capped } = await listAllDeals(
    filters,
    currentUserId,
    { take: DEAL_CSV_EXPORT_CAP },
  );
  const members = await listDealTeamMembers();
  const ownerNames = new Map(
    members.map((member) => [member.id, member.name || member.email]),
  );

  const header = [
    "Titel",
    "Bedrijf",
    "Contact",
    "Fase",
    "Status",
    "Waarde",
    "Bron",
    "Eigenaar",
    "Aangemaakt",
    "Verwachte sluiting",
  ];

  const rows = items.map((deal) => {
    const contact = deal.contact
      ? [deal.contact.firstName, deal.contact.lastName].filter(Boolean).join(" ")
      : "";
    const owner = deal.ownerUserId
      ? (ownerNames.get(deal.ownerUserId) ?? deal.ownerUserId)
      : "";
    const value = effectiveDealValue(
      deal.valueEstimate == null ? null : Number(deal.valueEstimate),
      deal.quotes,
    );
    return [
      deal.title,
      deal.company?.name ?? "",
      contact,
      deal.stage.name,
      deal.status,
      value == null ? "" : String(value),
      deal.source?.name ?? "",
      owner,
      deal.createdAt.toISOString(),
      deal.expectedClose ? deal.expectedClose.toISOString().slice(0, 10) : "",
    ].map((cell) => csvCell(cell));
  });

  const csv = `\uFEFF${[header, ...rows].map((row) => row.join(";")).join("\r\n")}\r\n`;
  const today = new Date().toISOString().slice(0, 10);
  return {
    csv,
    filename: `leads-${today}.csv`,
    total,
    capped,
  };
}

export const getDeal = cache(
  async function getDeal(id: string) {
    const prisma = getPrismaClient();
    const deal = await prisma.deal.findUnique({
      where: whereIdOrSlug(id),
      include: {
        company: { select: { id: true, slug: true, name: true } },
        contact: {
          select: {
            id: true,
            slug: true,
            firstName: true,
            lastName: true,
            companyId: true,
          },
        },
        stage: true,
        source: { select: { id: true, name: true } },
        quotes: {
          orderBy: { createdAt: "desc" },
          include: {
            orders: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                orderNumber: true,
                status: true,
                createdAt: true,
                total: true,
              },
            },
          },
        },
      },
    });

    if (!deal) {
      throw new AppError("Lead niet gevonden.", "NOT_FOUND", 404);
    }

    return deal;
  },
);

function statusForStage(stage: { isWon: boolean; isLost: boolean }): DealStatus {
  if (stage.isWon) return "WON";
  if (stage.isLost) return "LOST";
  return "OPEN";
}

async function assertDealRelations(input: DealInput) {
  const prisma = getPrismaClient();
  const stage = await prisma.dealStage.findUnique({ where: { id: input.stageId } });
  if (!stage) {
    throw new AppError("Fase niet gevonden.", "NOT_FOUND", 404);
  }

  let companyId = input.companyId ?? null;

  if (input.contactId) {
    const contact = await prisma.contact.findUnique({
      where: { id: input.contactId },
    });
    if (!contact) {
      throw new AppError("Contact niet gevonden.", "NOT_FOUND", 404);
    }
    const contactCompanyId = getContactCompanyId(contact);
    if (!companyId && contactCompanyId) {
      companyId = contactCompanyId;
    }
    assertDealContactCompany(contact, companyId);
  }

  if (companyId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new AppError("Bedrijf niet gevonden.", "NOT_FOUND", 404);
    }
  }

  return { stage, companyId };
}

export async function createDeal(input: DealInput, ownerUserId?: string) {
  const prisma = getPrismaClient();
  const { stage, companyId } = await assertDealRelations(input);

  const slug = await nextDealSlug(prisma, input.title);
  return prisma.deal.create({
    data: {
      id: createId(),
      slug,
      title: input.title,
      companyId,
      contactId: input.contactId ?? null,
      stageId: input.stageId,
      sourceId: input.sourceId ?? null,
      valueEstimate: input.valueEstimate ?? null,
      status: statusForStage(stage),
      ownerUserId: ownerUserId ?? null,
    },
  });
}

export async function updateDeal(id: string, input: DealInput, userId?: string) {
  const current = await getDeal(id);
  const prisma = getPrismaClient();
  const { stage, companyId } = await assertDealRelations(input);

  const slug = await nextDealSlug(prisma, input.title, current.id);
  const quotedTotal = sumActiveQuoteTotals(current.quotes);
  const updated = await prisma.deal.update({
    where: { id: current.id },
    data: {
      slug,
      title: input.title,
      companyId,
      contactId: input.contactId ?? null,
      stageId: input.stageId,
      sourceId: input.sourceId ?? null,
      valueEstimate: quotedTotal ?? input.valueEstimate ?? null,
      status: statusForStage(stage),
    },
  });

  if (current.stageId !== input.stageId) {
    await logEvent({
      type: "STAGE_CHANGE",
      body: `Verplaatst van ${current.stage.name} naar ${stage.name}`,
      userId: userId ?? null,
      dealId: id,
      contactId: current.contactId,
      companyId: current.companyId,
    });
  }

  return updated;
}

export async function moveDealToStage(
  id: string,
  stageId: string,
  userId?: string,
) {
  const deal = await getDeal(id);
  if (deal.stageId === stageId) return deal;

  const prisma = getPrismaClient();
  const stage = await prisma.dealStage.findUnique({ where: { id: stageId } });
  if (!stage) {
    throw new AppError("Fase niet gevonden.", "NOT_FOUND", 404);
  }

  const updated = await prisma.deal.update({
    where: { id: deal.id },
    data: {
      stageId,
      status: statusForStage(stage),
    },
  });

  await logEvent({
    type: "STAGE_CHANGE",
    body: `Verplaatst van ${deal.stage.name} naar ${stage.name}`,
    userId: userId ?? null,
    dealId: id,
    contactId: deal.contactId,
    companyId: deal.companyId,
  });

  return updated;
}

export async function setDealHot(id: string, isHot: boolean) {
  const deal = await getDeal(id);
  const prisma = getPrismaClient();
  return prisma.deal.update({
    where: { id: deal.id },
    data: { isHot },
  });
}

export async function setDealOwner(id: string, ownerUserId: string | null) {
  const deal = await getDeal(id);
  const nextOwnerId = ownerUserId?.trim() || null;
  if (deal.ownerUserId === nextOwnerId) return deal;

  const prisma = getPrismaClient();
  if (nextOwnerId) {
    const user = await prisma.user.findUnique({
      where: { id: nextOwnerId },
      select: { id: true, banned: true },
    });
    if (!user || user.banned === true) {
      throw new AppError("Medewerker niet gevonden.", "NOT_FOUND", 404);
    }
  }

  return prisma.deal.update({
    where: { id: deal.id },
    data: { ownerUserId: nextOwnerId },
  });
}

export async function addDealActivity(
  dealId: string,
  input: DealActivityInput,
  userId?: string,
) {
  const deal = await getDeal(dealId);
  return logEvent({
    type: input.type,
    body: input.body ?? null,
    userId: userId ?? null,
    dealId,
    contactId: deal.contactId,
    companyId: deal.companyId,
  });
}

export async function syncDealValueFromQuotes(
  dealId: string | null | undefined,
) {
  if (!dealId) return;
  const prisma = getPrismaClient();
  const quotes = await prisma.quote.findMany({
    where: { dealId },
    select: { total: true, status: true },
  });
  await prisma.deal.update({
    where: { id: dealId },
    data: { valueEstimate: sumActiveQuoteTotals(quotes) },
  });
}
