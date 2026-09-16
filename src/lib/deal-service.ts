import "server-only";

import { cache } from "react";
import { Prisma, type DealStatus } from "@/generated/prisma/client";
import { logAuditEvent } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/registry";
import {
  endExclusiveOfCalendarDate,
  normalizeDateOnlyInput,
  parseAmountInput,
  startOfCalendarDate,
} from "@/lib/date-input";
import {
  formatApplicationLabels,
  getIndustryLabel,
  getSectorLabel,
} from "@/lib/classification";
import { nextDealSlug } from "@/lib/entity-slug";
import { getContactCompanyId } from "@/lib/contact-company";
import { getPrismaClient } from "@/lib/db";
import { dealClassificationWhere } from "@/lib/classification-where";
import {
  assertDealContactCompany,
  dealCreationMatches,
  type DealActivityInput,
  type DealInput,
} from "@/lib/deal-validation";
import { AppError } from "@/lib/errors";
import { formatPersonName } from "@/lib/format";
import { createId, whereIdOrSlug } from "@/lib/id";
import {
  calculateLeadScore,
  getLeadScoreQuestion,
  isLeadScoreQuestionId,
  leadScoreAnswersFromFields,
  leadScoreCategoryLabel,
  leadScoreDerivedFields,
  leadScoreFilterWhereInput,
  leadScoreFractionLabel,
  leadScoreFromDeal,
  parseLeadScoreAnswer,
  LEAD_SCORE_FILTERS,
  type LeadScoreAnswers,
  type LeadScoreFilter,
  type LeadScoreResult,
} from "@/lib/lead-score";
import { logEvent } from "@/lib/timeline-service";
import { rowsFromCountMap } from "@/lib/filters/aggregate";
import {
  dealFacetCountsSql,
  type DealFacetWheres,
} from "@/lib/filters/facet-sql";
import { dealWhereSql } from "@/lib/filters/sql-where";
import type {
  DealDateField,
  DealSort,
  DealStatusFilter,
  DealsFilterValues,
} from "@/lib/deals-query";
import {
  effectiveDealValue,
  sumActiveQuoteTotals,
} from "@/lib/deal-value";
import { KANBAN_COLUMN_PAGE_SIZE } from "@/lib/kanban-deal";
import { escapeLikeTerm } from "@/lib/list-query";

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

export type TaskDealOption = {
  id: string;
  title: string;
  hint: string | null;
};

export async function listDealsForTaskSelect(): Promise<TaskDealOption[]> {
  const prisma = getPrismaClient();
  const deals = await prisma.deal.findMany({
    where: { status: "OPEN" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      company: { select: { name: true } },
      contact: { select: { firstName: true, lastName: true } },
    },
  });
  return deals.map((deal) => {
    const hint = [
      deal.company?.name,
      deal.contact
        ? formatPersonName(deal.contact.firstName, deal.contact.lastName)
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      id: deal.id,
      title: deal.title,
      hint: hint || null,
    };
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
  leadscore?: LeadScoreFilter | "";
  industries?: string[];
  sectors?: string[];
  applications?: string[];
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
  qualFit: true,
  qualNeed: true,
  qualIntent: true,
  qualDecision: true,
  qualTiming: true,
  leadScore: true,
  leadScoreAssessed: true,
  leadScoreNoMatch: true,
  company: {
    select: {
      id: true,
      slug: true,
      name: true,
      industryCode: true,
      sectorCode: true,
    },
  },
  contact: { select: { id: true, slug: true, firstName: true, lastName: true } },
  stage: { select: { id: true, name: true, isWon: true, isLost: true } },
  source: { select: { id: true, name: true } },
  applications: { select: { code: true } },
  quotes: {
    orderBy: { updatedAt: "desc" as const },
    select: { id: true, quoteNumber: true, status: true, total: true },
  },
} satisfies Prisma.DealSelect;

export const DEAL_LIST_PAGE_SIZE = 25;
const KANBAN_LIST_CAP = 1000;
const DEAL_CSV_EXPORT_CAP = 5000;
const KANBAN_EXCLUDE_ID_CAP = 2000;

export function dealListFiltersFromValues(
  values: DealsFilterValues,
): Omit<DealListFilters, "page" | "pageSize"> {
  return {
    zoeken: values.zoeken,
    stageId: values.fase || undefined,
    sourceId: values.bron || undefined,
    eigenaar: values.eigenaar,
    status: values.status,
    waardeMin: values.waardeMin || undefined,
    waardeMax: values.waardeMax || undefined,
    van: values.van || undefined,
    tot: values.tot || undefined,
    datumveld: values.datumveld,
    sortering: values.sortering,
    leadscore: values.leadscore,
    industries: values.branche,
    sectors: values.sector,
    applications: values.toepassing,
  };
}

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
    // searchIndex bevat title + bedrijfsnaam + contactnaam, lowercase, en
    // wordt door triggers bijgehouden. Eén kolomvergelijking i.p.v. twee
    // gecorreleerde subquery's per rij; zelfde substring-semantiek.
    and.push({
      searchIndex: { contains: escapeLikeTerm(search.toLowerCase()) },
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

  if (filters.leadscore) {
    and.push(leadScoreFilterWhereInput(filters.leadscore));
  }

  const classification = dealClassificationWhere({
    industries: filters.industries ?? [],
    sectors: filters.sectors ?? [],
    applications: filters.applications ?? [],
  });
  if (classification) and.push(classification);

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
    case "leadscore":
      return [{ leadScoreSort: "desc" }, { id: "desc" }];
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

export async function listKanbanDeals(
  filters: Omit<DealListFilters, "page" | "pageSize" | "stageId"> = {},
  currentUserId?: string,
): Promise<{ items: DealListItem[]; total: number }> {
  const prisma = getPrismaClient();
  const where = buildDealListWhere(filters, currentUserId);
  const orderBy = buildDealOrderBy(filters.sortering);
  const stages = await listDealStages();

  const [total, columns] = await Promise.all([
    prisma.deal.count({ where }),
    Promise.all(
      stages.map((stage) =>
        prisma.deal.findMany({
          where: { AND: [where, { stageId: stage.id }] },
          select: dealListSelect,
          orderBy,
          take: KANBAN_COLUMN_PAGE_SIZE,
        }),
      ),
    ),
  ]);

  return { items: columns.flat(), total };
}

function uniqueExcludeIds(excludeIds: string[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const value of excludeIds) {
    if (typeof value !== "string") continue;
    const id = value.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= KANBAN_EXCLUDE_ID_CAP) break;
  }
  return ids;
}

export async function listKanbanColumnPage(
  filters: Omit<DealListFilters, "page" | "pageSize"> & { stageId: string },
  currentUserId: string | undefined,
  excludeIds: string[] = [],
): Promise<{ items: DealListItem[] }> {
  const prisma = getPrismaClient();
  const stageId = filters.stageId.trim();
  if (!stageId) return { items: [] };

  const where = buildDealListWhere({ ...filters, stageId }, currentUserId);
  const excluded = uniqueExcludeIds(excludeIds);
  const pagedWhere: Prisma.DealWhereInput =
    excluded.length > 0 ? { AND: [where, { id: { notIn: excluded } }] } : where;

  const items = await prisma.deal.findMany({
    where: pagedWhere,
    select: dealListSelect,
    orderBy: buildDealOrderBy(filters.sortering),
    take: KANBAN_COLUMN_PAGE_SIZE,
  });

  return { items };
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

export type FacetCountRow = { value: string; count: number };

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
  scoreTotal: number;
  byScore: Record<LeadScoreFilter, number>;
  byIndustry: FacetCountRow[];
  bySector: FacetCountRow[];
  byApplication: FacetCountRow[];
  stale: boolean;
  classificationStale: boolean;
};

const EMPTY_SCORE_FACETS = Object.fromEntries(
  LEAD_SCORE_FILTERS.map((filter) => [filter, 0]),
) as Record<LeadScoreFilter, number>;

/**
 * Facet counts for the leads filter bar.
 * Each dimension ignores its own filter (Other Filters Changed).
 *
 * Aggregatie gebeurt in de database: acht GROUP BY's die alleen groepsrijen
 * teruggeven. Eerder liep dit via `groupBy(["companyId"])` plus een tweede
 * query met `IN (…alle company-id's…)`, wat lineair meegroeide met de dataset.
 */
export async function getDealFilterFacets(
  filters: DealListFilters = {},
  currentUserId?: string,
): Promise<DealFilterFacets> {
  const wheres: DealFacetWheres = {
    stage: dealWhereSql({ ...filters, stageId: undefined }, currentUserId),
    source: dealWhereSql({ ...filters, sourceId: undefined }, currentUserId),
    owner: dealWhereSql({ ...filters, eigenaar: "alle" }, currentUserId),
    status: dealWhereSql({ ...filters, status: "alle" }, currentUserId),
    score: dealWhereSql({ ...filters, leadscore: "" }, currentUserId),
    industry: dealWhereSql({ ...filters, industries: [] }, currentUserId),
    sector: dealWhereSql({ ...filters, sectors: [] }, currentUserId),
    application: dealWhereSql({ ...filters, applications: [] }, currentUserId),
  };

  const facets = await dealFacetCountsSql(wheres).catch(() => null);

  if (!facets) {
    return {
      stageTotal: 0,
      byStage: [],
      sourceTotal: 0,
      unassignedSource: 0,
      bySource: [],
      ownerTotal: 0,
      unassignedOwner: 0,
      assignedToMe: 0,
      byOwner: [],
      statusTotal: 0,
      byStatus: {},
      scoreTotal: 0,
      byScore: { ...EMPTY_SCORE_FACETS },
      byIndustry: [],
      bySector: [],
      byApplication: [],
      stale: true,
      classificationStale: true,
    };
  }

  const byStatus: Partial<Record<DealStatus, number>> = {};
  for (const [status, count] of facets.status) {
    byStatus[status as DealStatus] = count;
  }

  return {
    stageTotal: facets.stageTotal,
    byStage: [...facets.stage].map(([stageId, count]) => ({ stageId, count })),
    sourceTotal: facets.sourceTotal,
    unassignedSource: facets.unassignedSource,
    bySource: [...facets.source]
      .filter(([sourceId]) => sourceId !== "geen")
      .map(([sourceId, count]) => ({ sourceId, count })),
    ownerTotal: facets.ownerTotal,
    unassignedOwner: facets.unassignedOwner,
    assignedToMe: currentUserId ? (facets.owner.get(currentUserId) ?? 0) : 0,
    byOwner: [...facets.owner].map(([userId, count]) => ({ userId, count })),
    statusTotal: facets.statusTotal,
    byStatus,
    scoreTotal: facets.scoreTotal,
    byScore: facets.score,
    byIndustry: rowsFromCountMap(facets.industry),
    bySector: rowsFromCountMap(facets.sector),
    byApplication: rowsFromCountMap(facets.application),
    stale: false,
    classificationStale: false,
  };
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
    "Hoofdbranche",
    "Sector",
    "Contact",
    "Fase",
    "Leadscore",
    "Scorecategorie",
    "Status",
    "Waarde",
    "Bron",
    "Toepassingen",
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
    const score = leadScoreFromDeal(deal);
    return [
      deal.title,
      deal.company?.name ?? "",
      getIndustryLabel(deal.company?.industryCode) ?? "",
      getSectorLabel(deal.company?.industryCode, deal.company?.sectorCode) ?? "",
      contact,
      deal.stage.name,
      leadScoreFractionLabel(score) ?? "Niet beoordeeld",
      leadScoreCategoryLabel(score.category),
      deal.status,
      value == null ? "" : String(value),
      deal.source?.name ?? "",
      formatApplicationLabels(deal.applications.map((item) => item.code)),
      owner,
      deal.createdAt.toISOString(),
      deal.expectedClose ? deal.expectedClose.toISOString().slice(0, 10) : "",
    ].map((cell) => csvCell(cell));
  });

  const csv = `\uFEFF${[header, ...rows].map((row) => row.join(";")).join("\r\n")}\r\n`;
  const today = new Date().toISOString().slice(0, 10);
  // Een export haalt persoonsgegevens uit het systeem; het aantal rijen is de
  // enige metadata. De filterwaarden blijven er bewust buiten.
  await logAuditEvent({
    eventType: "EXPORT_COMPLETED",
    category: "IMPORT_EXPORT",
    action: AUDIT_ACTIONS.exportLeads,
    result: capped ? "PARTIAL" : "SUCCESS",
    metadata: { aantal: rows.length },
  });
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
        company: {
          select: {
            id: true,
            slug: true,
            name: true,
            industryCode: true,
            sectorCode: true,
          },
        },
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
        applications: { select: { code: true } },
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

async function replaceDealApplications(
  prisma: ReturnType<typeof getPrismaClient>,
  dealId: string,
  codes: string[] | undefined,
) {
  if (codes === undefined) return;
  await prisma.dealApplication.deleteMany({ where: { dealId } });
  if (codes.length === 0) return;
  await prisma.dealApplication.createMany({
    data: codes.map((code) => ({ dealId, code })),
  });
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

function settleExistingDeal<T extends {
  title: string;
  companyId: string | null;
  contactId: string | null;
  stageId: string;
  sourceId: string | null;
  valueEstimate: { toString(): string } | number | string | null;
}>(existing: T, input: DealInput): T {
  if (!dealCreationMatches(existing, input)) {
    throw new AppError(
      "Deze indiening hoort bij een andere lead. Ververs de pagina en probeer opnieuw.",
      "CONFLICT",
      409,
    );
  }
  return existing;
}

export async function createDeal(
  input: DealInput,
  ownerUserId?: string,
  options?: { submissionId?: string },
) {
  const prisma = getPrismaClient();
  const submissionId = options?.submissionId?.trim() || undefined;

  if (submissionId) {
    const existing = await prisma.deal.findUnique({
      where: { submissionId },
    });
    if (existing) {
      return settleExistingDeal(existing, input);
    }
  }

  const { stage, companyId } = await assertDealRelations(input);

  const slug = await nextDealSlug(prisma, input.title);
  try {
    const created = await prisma.deal.create({
      data: {
        id: createId(),
        slug,
        submissionId: submissionId ?? null,
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
    await replaceDealApplications(prisma, created.id, input.applications);
    // Alleen op het echte create-pad: een herhaalde submissie eindigt bij
    // settleExistingDeal en levert dus geen tweede event op.
    await logAuditEvent({
      eventType: "CREATE",
      category: "LEADS",
      action: AUDIT_ACTIONS.leadCreate,
      entityType: "deal",
      entityId: created.id,
      entityLabel: created.title,
      metadata: {
        slug: created.slug,
        fase: created.stageId,
        status: created.status,
        bedrijf: created.companyId,
        eigenaar: created.ownerUserId,
      },
    });
    return created;
  } catch (error) {
    if (submissionId && isUniqueConstraintError(error)) {
      const existing = await prisma.deal.findUnique({
        where: { submissionId },
      });
      if (existing) {
        return settleExistingDeal(existing, input);
      }
    }
    throw error;
  }
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
  await replaceDealApplications(prisma, updated.id, input.applications);

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

  await logAuditEvent({
    eventType: "UPDATE",
    category: "LEADS",
    action: AUDIT_ACTIONS.leadUpdate,
    entityType: "deal",
    entityId: updated.id,
    entityLabel: updated.title,
    // Alleen wélke velden veranderden, niet de ingevulde waarden.
    metadata: {
      velden: changedDealFields(current, updated),
      faseGewijzigd: current.stageId !== updated.stageId,
    },
  });

  return updated;
}

/** Namen van de gewijzigde velden; bewust zonder de waarden zelf. */
function changedDealFields(
  before: { [key: string]: unknown },
  after: { [key: string]: unknown },
): string[] {
  const tracked = [
    "title",
    "companyId",
    "contactId",
    "stageId",
    "sourceId",
    "valueEstimate",
    "status",
  ];
  return tracked.filter(
    (field) => String(before[field] ?? "") !== String(after[field] ?? ""),
  );
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

  await logAuditEvent({
    eventType: "STATUS_CHANGED",
    category: "LEADS",
    action: AUDIT_ACTIONS.leadStatusChange,
    entityType: "deal",
    entityId: updated.id,
    entityLabel: updated.title,
    metadata: {
      vorigeFase: deal.stageId,
      nieuweFase: stageId,
      status: updated.status,
    },
  });

  return updated;
}

export async function setDealHot(id: string, isHot: boolean) {
  const deal = await getDeal(id);
  const prisma = getPrismaClient();
  const updated = await prisma.deal.update({
    where: { id: deal.id },
    data: { isHot },
  });
  await logAuditEvent({
    eventType: "UPDATE",
    category: "LEADS",
    action: AUDIT_ACTIONS.leadHotToggle,
    entityType: "deal",
    entityId: updated.id,
    entityLabel: updated.title,
    metadata: { isHot: updated.isHot },
  });
  return updated;
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
      throw new AppError("Teamlid niet gevonden.", "NOT_FOUND", 404);
    }
  }

  const updated = await prisma.deal.update({
    where: { id: deal.id },
    data: { ownerUserId: nextOwnerId },
  });
  await logAuditEvent({
    eventType: "UPDATE",
    category: "LEADS",
    action: AUDIT_ACTIONS.leadOwnerChange,
    entityType: "deal",
    entityId: updated.id,
    entityLabel: updated.title,
    metadata: { vorige: deal.ownerUserId, nieuwe: nextOwnerId },
  });
  return updated;
}

const qualificationSelect = {
  slug: true,
  qualFit: true,
  qualNeed: true,
  qualIntent: true,
  qualDecision: true,
  qualTiming: true,
} satisfies Prisma.DealSelect;

export async function setDealQualificationAnswer(
  id: string,
  questionId: string,
  answerKey: string | null,
): Promise<{
  slug: string;
  answers: LeadScoreAnswers;
  result: LeadScoreResult;
}> {
  const current = await getDeal(id);
  const question = getLeadScoreQuestion(questionId);
  if (!question || !isLeadScoreQuestionId(questionId)) {
    throw new AppError("Onbekende kwalificatievraag.", "VALIDATION");
  }
  const parsed = parseLeadScoreAnswer(questionId, answerKey);
  const field = question.field;
  const prisma = getPrismaClient();

  const updated = await prisma.$transaction(async (tx) => {
    // Geparameteriseerd via Prisma.sql; $queryRawUnsafe is hier niet nodig.
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM deal WHERE id = ${current.id} FOR UPDATE`,
    );
    const locked = await tx.deal.findUnique({
      where: { id: current.id },
      select: qualificationSelect,
    });
    if (!locked) {
      throw new AppError("Lead niet gevonden.", "NOT_FOUND", 404);
    }

    const answers: LeadScoreAnswers = {
      ...leadScoreAnswersFromFields(locked),
      [question.id]: parsed,
    };
    const result = calculateLeadScore(answers);

    return tx.deal.update({
      where: { id: current.id },
      data: {
        [field]: parsed,
        ...leadScoreDerivedFields(result),
      },
      select: qualificationSelect,
    });
  });

  const answers = leadScoreAnswersFromFields(updated);
  const result = calculateLeadScore(answers);

  // Buiten de transactie: een logregel hoort niet onder de rijlock te vallen.
  await logAuditEvent({
    eventType: "UPDATE",
    category: "LEADS",
    action: AUDIT_ACTIONS.leadQualification,
    entityType: "deal",
    entityId: current.id,
    entityLabel: current.title,
    metadata: {
      vraag: questionId,
      antwoord: parsed,
      score: result.score,
      beoordeeld: result.assessedCount,
    },
  });

  return {
    slug: updated.slug,
    answers,
    result,
  };
}

export async function addDealActivity(
  dealId: string,
  input: DealActivityInput,
  userId?: string,
) {
  const deal = await getDeal(dealId);
  const event = await logEvent({
    type: input.type,
    body: input.body ?? null,
    userId: userId ?? null,
    dealId,
    contactId: deal.contactId,
    companyId: deal.companyId,
  });
  // Het label komt van de lead; de body is vrije tekst en hoort niet in het log.
  await logAuditEvent({
    eventType: "CREATE",
    category: "LEADS",
    action: AUDIT_ACTIONS.leadActivityCreate,
    entityType: "timelineEvent",
    entityId: event.id,
    entityLabel: deal.title,
    metadata: { type: event.type, lead: deal.id },
  });
  return event;
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

export async function deleteDeal(id: string) {
  const current = await getDeal(id);
  const prisma = getPrismaClient();
  await prisma.deal.delete({ where: { id: current.id } });
  await logAuditEvent({
    eventType: "DELETE",
    category: "LEADS",
    action: AUDIT_ACTIONS.leadDelete,
    entityType: "deal",
    entityId: current.id,
    entityLabel: current.title,
    severity: "NOTICE",
    metadata: {
      slug: current.slug,
      fase: current.stageId,
      status: current.status,
      offertes: current.quotes.length,
    },
  });
  return current;
}
