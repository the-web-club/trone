import "server-only";

import { cache } from "react";
import { Prisma } from "@/generated/prisma/client";
import { logAuditEvent } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/registry";
import { nextCompanySlug } from "@/lib/entity-slug";
import { AppError } from "@/lib/errors";
import { createId, whereIdOrSlug } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import type { CompanyInput } from "@/lib/company-validation";
import { createWithSubmissionId } from "@/lib/idempotent-create";
import { companyClassificationWhere } from "@/lib/classification-where";
import {
  CLASSIFICATION_FILTER_UNKNOWN,
} from "@/lib/classification";
import {
  parseCompanyLeadsFilter,
  type CompanyLeadFacets,
  type CompanyOwnerFacets,
} from "@/lib/companies-query";
import { escapeLikeTerm, paginateArgs, type PagedList } from "@/lib/list-query";
import { checkViesVatNumber } from "@/lib/vies-service";
import { resolveVatTreatment } from "@/lib/vat";
import { ownerFacetsFromGroups, rowsFromCountMap } from "@/lib/filters/aggregate";
import { companyFacetCountsSql } from "@/lib/filters/facet-sql";
import {
  andSql,
  companyLeadBucketSql,
  companyWhereSql,
} from "@/lib/filters/sql-where";

export async function listCompanies(query?: string) {
  const prisma = getPrismaClient();
  const where = query ? { name: { contains: query } } : {};

  return prisma.company.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { contacts: true } },
    },
  });
}

export type CompanySelectOption = {
  id: string;
  slug: string;
  name: string;
  industryCode: string | null;
  sectorCode: string | null;
};

const companySelectOptionFields = {
  id: true,
  slug: true,
  name: true,
  industryCode: true,
  sectorCode: true,
} satisfies Prisma.CompanySelect;

/** Bovengrens voor keuzelijsten; de UI zoekt server-side verder. */
export const SELECT_OPTION_LIMIT = 50;
const SELECT_OPTION_MAX = 100;
/** `includeIds` komt uit facetrijen en is daarmee al begrensd. */
const PINNED_ID_MAX = 500;

/**
 * Bedrijfsopties voor combobox'en en filterdropdowns.
 *
 * Nooit de hele tabel: die ging via props de RSC-payload in en was op 5.000
 * bedrijven al hondertallen KB's per filteractie. `includeIds` houdt de
 * huidige selectie in de lijst, zodat het label blijft kloppen zonder dat de
 * client alles nodig heeft.
 */
export async function searchCompaniesForSelect(options?: {
  query?: string;
  take?: number;
  includeIds?: readonly string[];
}): Promise<CompanySelectOption[]> {
  const prisma = getPrismaClient();
  const take = Math.min(
    Math.max(options?.take ?? SELECT_OPTION_LIMIT, 1),
    SELECT_OPTION_MAX,
  );
  const query = options?.query?.trim();
  const includeIds = [...new Set(options?.includeIds?.filter(Boolean) ?? [])];

  const [matches, pinned] = await Promise.all([
    prisma.company.findMany({
      where: query ? { name: { contains: escapeLikeTerm(query) } } : {},
      orderBy: { name: "asc" },
      select: companySelectOptionFields,
      take,
    }),
    includeIds.length > 0
      ? prisma.company.findMany({
          where: { id: { in: includeIds.slice(0, PINNED_ID_MAX) } },
          select: companySelectOptionFields,
        })
      : Promise.resolve([]),
  ]);

  const byId = new Map<string, CompanySelectOption>();
  for (const row of pinned) byId.set(row.id, row);
  for (const row of matches) byId.set(row.id, row);
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "nl"));
}

/**
 * Namen voor een bekende, begrensde set id's (doorgaans facetrijen).
 * Zo hoeft een filterdropdown niet de hele bedrijfstabel te ontvangen om
 * labels te kunnen tonen.
 */
export async function companyNamesByIds(
  ids: readonly string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, PINNED_ID_MAX);
  if (unique.length === 0) return new Map();
  const prisma = getPrismaClient();
  const rows = await prisma.company.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true },
  });
  return new Map(rows.map((row) => [row.id, row.name]));
}

export type CompanyListFilters = {
  query?: string;
  city?: string;
  country?: string;
  eigenaar?: string;
  leads?: string;
  industries?: string[];
  sectors?: string[];
  applications?: string[];
  page?: number;
  pageSize?: number;
};

const NO_MATCH_ID = "__no_match__";

export function buildCompanyListWhere(
  filters: CompanyListFilters,
  currentUserId?: string,
): Prisma.CompanyWhereInput {
  const and: Prisma.CompanyWhereInput[] = [];

  const eigenaar = filters.eigenaar?.trim() || "alle";
  if (eigenaar === "aan-mij") {
    and.push({ ownerUserId: currentUserId ?? NO_MATCH_ID });
  } else if (eigenaar === "niet-toegewezen") {
    and.push({ ownerUserId: null });
  } else if (eigenaar !== "alle") {
    and.push({ ownerUserId: eigenaar });
  }

  const query = filters.query?.trim();
  if (query) and.push({ name: { contains: escapeLikeTerm(query) } });
  const city = filters.city?.trim();
  if (city === CLASSIFICATION_FILTER_UNKNOWN) {
    and.push({ city: null });
  } else if (city) {
    and.push({ city });
  }
  if (filters.country?.trim()) and.push({ country: filters.country.trim() });
  const classification = companyClassificationWhere({
    industries: filters.industries ?? [],
    sectors: filters.sectors ?? [],
    applications: filters.applications ?? [],
  });
  if (classification) and.push(classification);
  return and.length ? { AND: and } : {};
}

/**
 * Lead-aantal is een aggregaat en past niet in een Prisma `where`. Eerder
 * haalde dit alle matchende company-id's op en zette die in één
 * `IN (…)`-lijst, die met de dataset meegroeide. Nu bepaalt de database de
 * pagina met een subquery-predicaat en komen alleen de id's van één pagina
 * terug.
 */
async function companyIdPageWithLeadFilter(
  filters: CompanyListFilters,
  currentUserId: string | undefined,
  skip: number,
  take: number,
): Promise<{ ids: string[]; total: number }> {
  const prisma = getPrismaClient();
  const where = andSql([
    companyWhereSql(filters, currentUserId),
    companyLeadBucketSql(filters.leads),
  ]);

  const [rows, totals] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT co.id FROM company co WHERE ${where} ORDER BY co.name ASC, co.id ASC LIMIT ${take} OFFSET ${skip}`,
    ),
    prisma.$queryRaw<Array<{ n: bigint | number }>>(
      Prisma.sql`SELECT COUNT(*) AS n FROM company co WHERE ${where}`,
    ),
  ]);

  return {
    ids: rows.map((row) => row.id),
    total: Number(totals[0]?.n ?? 0),
  };
}

/**
 * Prisma-where voor de lijst. De `leads`-bucket zit hier niet in: die loopt
 * via `companyIdPageWithLeadFilter`, omdat een aggregaat niet in een Prisma
 * `where` past. `geen` kan wel, want dat is puur relationeel.
 */
export function resolveCompanyListWhere(
  filters: CompanyListFilters,
  currentUserId?: string,
): Prisma.CompanyWhereInput {
  const where = buildCompanyListWhere(filters, currentUserId);
  const leads = parseCompanyLeadsFilter(filters.leads);
  if (leads === "geen") {
    return { AND: [where, { deals: { none: {} } }] };
  }
  return where;
}

const companyRowSelect = {
  id: true,
  slug: true,
  name: true,
  city: true,
  country: true,
  ownerUserId: true,
  industryCode: true,
  sectorCode: true,
  _count: { select: { contacts: true, deals: true } },
} satisfies Prisma.CompanySelect;

export async function listCompanyRows(
  filters: CompanyListFilters = {},
  currentUserId?: string,
): Promise<
  PagedList<{
    id: string;
    slug: string;
    name: string;
    city: string | null;
    country: string;
    ownerUserId: string | null;
    industryCode: string | null;
    sectorCode: string | null;
    _count: { contacts: number; deals: number };
  }>
> {
  const prisma = getPrismaClient();
  const { page, pageSize, skip, take } = paginateArgs(
    filters.page,
    filters.pageSize,
  );
  const leads = parseCompanyLeadsFilter(filters.leads);

  // Exacte of 5+-bucket: de database bepaalt de pagina, wij halen die rijen op.
  if (leads !== "alle" && leads !== "geen") {
    const { ids, total } = await companyIdPageWithLeadFilter(
      filters,
      currentUserId,
      skip,
      take,
    );
    if (ids.length === 0) return { items: [], total, page, pageSize };

    const rows = await prisma.company.findMany({
      where: { id: { in: ids } },
      select: companyRowSelect,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const items = ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [row] : [];
    });
    return { items, total, page, pageSize };
  }

  const where = resolveCompanyListWhere(filters, currentUserId);
  const [total, items] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: companyRowSelect,
      skip,
      take,
    }),
  ]);

  return { items, total, page, pageSize };
}

export async function getCompanyOwnerFacets(
  filters: CompanyListFilters = {},
  currentUserId?: string,
): Promise<CompanyOwnerFacets> {
  const prisma = getPrismaClient();
  const where = andSql([
    companyWhereSql({ ...filters, eigenaar: "alle" }, currentUserId),
    companyLeadBucketSql(filters.leads),
  ]);
  const rows = await prisma.$queryRaw<
    Array<{ value: string | null; n: bigint | number }>
  >(
    Prisma.sql`SELECT co.ownerUserId AS value, COUNT(*) AS n FROM company co WHERE ${where} GROUP BY co.ownerUserId`,
  );
  return ownerFacetsFromGroups(
    rows.map((row) => ({
      ownerUserId: row.value,
      _count: { _all: Number(row.n) },
    })),
    currentUserId,
  );
}

export type CompanyFilterFacets = CompanyOwnerFacets & {
  leads: CompanyLeadFacets;
  byCity: Array<{ value: string; count: number }>;
  unassignedCity: number;
  cityTotal: number;
  byCountry: Array<{ value: string; count: number }>;
  countryTotal: number;
  byIndustry: Array<{ value: string; count: number }>;
  bySector: Array<{ value: string; count: number }>;
  byApplication: Array<{ value: string; count: number }>;
  classificationStale: boolean;
};

/**
 * Alle bedrijfsfacetten in één gebundelde set aggregatiequery's. Elke
 * dimensie negeert zijn eigen filter; de `leads`-bucket blijft wel staan
 * behalve in zijn eigen facet.
 */
export async function getCompanyFilterFacets(
  filters: CompanyListFilters = {},
  currentUserId?: string,
): Promise<CompanyFilterFacets> {
  const bucket = companyLeadBucketSql(filters.leads);
  const withBucket = (overrides: Partial<CompanyListFilters>) =>
    andSql([
      companyWhereSql({ ...filters, ...overrides }, currentUserId),
      bucket,
    ]);

  const facets = await companyFacetCountsSql({
    city: withBucket({ city: undefined }),
    country: withBucket({ country: undefined }),
    owner: withBucket({ eigenaar: "alle" }),
    // Eigen dimensie: bucket bewust weggelaten.
    leads: companyWhereSql({ ...filters, leads: "alle" }, currentUserId),
    industry: withBucket({ industries: [] }),
    sector: withBucket({ sectors: [] }),
    application: withBucket({ applications: [] }),
  }).catch(() => null);

  if (!facets) {
    return {
      ownerTotal: 0,
      unassignedOwner: 0,
      assignedToMe: 0,
      byOwner: [],
      leads: { total: 0, none: 0, byCount: { "1": 0, "2": 0, "3": 0, "4": 0, "5plus": 0 } },
      byCity: [],
      unassignedCity: 0,
      cityTotal: 0,
      byCountry: [],
      countryTotal: 0,
      byIndustry: [],
      bySector: [],
      byApplication: [],
      classificationStale: true,
    };
  }

  return {
    ownerTotal: facets.ownerTotal,
    unassignedOwner: facets.unassignedOwner,
    assignedToMe: currentUserId ? (facets.owner.get(currentUserId) ?? 0) : 0,
    byOwner: [...facets.owner].map(([userId, count]) => ({ userId, count })),
    leads: {
      total: facets.leadsTotal,
      none: facets.leadsNone,
      byCount: facets.leadsByBucket,
    },
    cityTotal: facets.cityTotal,
    unassignedCity: facets.unassignedCity,
    byCity: [...facets.city].map(([value, count]) => ({ value, count })),
    countryTotal: facets.countryTotal,
    byCountry: [...facets.country].map(([value, count]) => ({ value, count })),
    byIndustry: rowsFromCountMap(facets.industry),
    bySector: rowsFromCountMap(facets.sector),
    byApplication: rowsFromCountMap(facets.application),
    classificationStale: false,
  };
}

export async function listCompanyCities() {
  const prisma = getPrismaClient();
  const rows = await prisma.company.findMany({
    where: { city: { not: null } },
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });
  return rows
    .map((row) => row.city)
    .filter((city): city is string => Boolean(city?.trim()));
}

export async function listCompanyCountries() {
  const prisma = getPrismaClient();
  const rows = await prisma.company.findMany({
    select: { country: true },
    distinct: ["country"],
    orderBy: { country: "asc" },
  });
  return rows.map((row) => row.country).filter(Boolean);
}

export const getCompany = cache(
  async function getCompany(id: string) {
    const prisma = getPrismaClient();
    const company = await prisma.company.findUnique({
      where: whereIdOrSlug(id),
      include: {
        relationTypes: { select: { code: true } },
        contacts: {
          orderBy: [{ isPrimary: "desc" }, { firstName: "asc" }],
        },
        deals: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            applications: { select: { code: true } },
            contact: {
              select: {
                id: true,
                slug: true,
                firstName: true,
                lastName: true,
              },
            },
            stage: {
              select: { name: true, isWon: true, isLost: true },
            },
          },
        },
      },
    });

    if (!company) {
      throw new AppError("Bedrijf niet gevonden.", "NOT_FOUND", 404);
    }

    return company;
  },
);

function toCompanyData(input: CompanyInput) {
  return {
    name: input.name,
    email: input.email ?? null,
    vatNumber: input.vatNumber ?? null,
    cocNumber: input.cocNumber ?? null,
    website: input.website ?? null,
    phone: input.phone ?? null,
    addressLine: input.addressLine ?? null,
    postalCode: input.postalCode ?? null,
    city: input.city ?? null,
    country: input.country,
    vatRate: input.vatRate,
    notes: input.notes ?? null,
    industryCode: input.industryCode ?? null,
    sectorCode: input.sectorCode ?? null,
  };
}

async function replaceCompanyRelationTypes(
  prisma: ReturnType<typeof getPrismaClient>,
  companyId: string,
  codes: string[] | undefined,
) {
  if (codes === undefined) return;
  await prisma.companyRelationType.deleteMany({ where: { companyId } });
  if (codes.length === 0) return;
  await prisma.companyRelationType.createMany({
    data: codes.map((code) => ({ companyId, code })),
  });
}

export async function validateCompanyVat(
  id: string,
  input: {
    vatNumber?: string | null;
    country?: string | null;
    applyProposedRate?: boolean;
  },
) {
  const current = await getCompany(id);
  const vatNumber = input.vatNumber ?? current.vatNumber;
  const country = input.country ?? current.country;
  const result = await checkViesVatNumber(vatNumber, {
    fallbackCountry: country,
  });
  const treatment = resolveVatTreatment(country, result.status);
  const needsConfirmation = treatment.vatRegime === "VERLEGD";
  const applyRate =
    input.applyProposedRate === true || !needsConfirmation;

  const prisma = getPrismaClient();
  const updated = await prisma.company.update({
    where: { id: current.id },
    data: {
      vatNumber: vatNumber ?? null,
      country,
      viesValid:
        result.status === "GELDIG"
          ? true
          : result.status === "ONGELDIG"
            ? false
            : current.viesValid,
      viesValidatedAt:
        result.status === "GELDIG" || result.status === "ONGELDIG"
          ? new Date()
          : current.viesValidatedAt,
      viesCheckedName:
        result.status === "GELDIG" || result.status === "ONGELDIG"
          ? result.name
          : current.viesCheckedName,
      ...(applyRate ? { vatRate: treatment.vatRate } : {}),
    },
  });

  // Externe aanroep naar VIES: een integratie-event, met de uitkomst maar
  // zonder het btw-nummer zelf.
  // ONBEKEND betekent dat VIES geen uitspraak deed (dienst onbereikbaar of
  // niet-EU); dat is geen fout van ons, maar wel een onvolledige uitkomst.
  const viesUnknown = result.status === "ONBEKEND";
  await logAuditEvent({
    eventType: "INTEGRATION_CALL",
    category: "INTEGRATION",
    action: AUDIT_ACTIONS.integrationVies,
    entityType: "company",
    entityId: updated.id,
    entityLabel: updated.name,
    result: viesUnknown ? "PARTIAL" : "SUCCESS",
    metadata: {
      status: result.status,
      land: country,
      regime: treatment.vatRegime,
      tariefToegepast: applyRate,
    },
  });

  return {
    company: updated,
    result,
    treatment,
    needsConfirmation: needsConfirmation && !input.applyProposedRate,
    appliedVatRate: applyRate ? treatment.vatRate : null,
  };
}

export async function createCompany(
  input: CompanyInput,
  ownerUserId?: string,
  options?: { submissionId?: string },
) {
  const prisma = getPrismaClient();
  return createWithSubmissionId({
    submissionId: options?.submissionId,
    findExisting: (submissionId) =>
      prisma.company.findUnique({ where: { submissionId } }),
    matches: (existing) =>
      existing.name === input.name &&
      (existing.email ?? null) === (input.email ?? null) &&
      (existing.phone ?? null) === (input.phone ?? null) &&
      existing.country === input.country,
    create: async () => {
      const slug = await nextCompanySlug(prisma, input.name);
      const company = await prisma.company.create({
        data: {
          id: createId(),
          slug,
          submissionId: options?.submissionId ?? null,
          ...toCompanyData(input),
          ownerUserId: ownerUserId ?? null,
        },
      });
      await replaceCompanyRelationTypes(
        prisma,
        company.id,
        input.relationTypes,
      );
      // Alleen loggen op het echte create-pad: bij een herhaalde submissie
      // levert createWithSubmissionId het bestaande record terug zonder deze
      // callback aan te roepen, en dan is er ook geen nieuw event.
      await logAuditEvent({
        eventType: "CREATE",
        category: "COMPANIES",
        action: AUDIT_ACTIONS.companyCreate,
        entityType: "company",
        entityId: company.id,
        entityLabel: company.name,
        metadata: {
          slug: company.slug,
          land: company.country,
          eigenaar: company.ownerUserId,
        },
      });
      return company;
    },
  });
}

export async function setCompanyOwner(id: string, ownerUserId: string | null) {
  const company = await getCompany(id);
  const nextOwnerId = ownerUserId?.trim() || null;
  if (company.ownerUserId === nextOwnerId) return company;

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

  const updated = await prisma.company.update({
    where: { id: company.id },
    data: { ownerUserId: nextOwnerId },
  });
  await logAuditEvent({
    eventType: "UPDATE",
    category: "COMPANIES",
    action: AUDIT_ACTIONS.companyOwnerChange,
    entityType: "company",
    entityId: updated.id,
    entityLabel: updated.name,
    metadata: { vorige: company.ownerUserId, nieuwe: nextOwnerId },
  });
  return updated;
}

export async function updateCompany(id: string, input: CompanyInput) {
  const current = await getCompany(id);
  const prisma = getPrismaClient();
  const slug = await nextCompanySlug(prisma, input.name, current.id);
  const vatIdentityChanged =
    (input.vatNumber ?? null) !== (current.vatNumber ?? null) ||
    input.country !== current.country;
  const classificationData =
    input.industryCode !== undefined || input.sectorCode !== undefined
      ? {
          industryCode: input.industryCode ?? null,
          sectorCode: input.sectorCode ?? null,
        }
      : {};
  const baseData = toCompanyData(input);
  const updated = await prisma.company.update({
    where: { id: current.id },
    data: {
      name: baseData.name,
      email: baseData.email,
      vatNumber: baseData.vatNumber,
      cocNumber: baseData.cocNumber,
      website: baseData.website,
      phone: baseData.phone,
      addressLine: baseData.addressLine,
      postalCode: baseData.postalCode,
      city: baseData.city,
      country: baseData.country,
      vatRate: baseData.vatRate,
      notes: baseData.notes,
      ...classificationData,
      slug,
      ...(vatIdentityChanged
        ? {
            viesValidatedAt: null,
            viesValid: null,
            viesCheckedName: null,
          }
        : {}),
    },
  });
  await replaceCompanyRelationTypes(
    prisma,
    updated.id,
    input.relationTypes,
  );
  await logAuditEvent({
    eventType: "UPDATE",
    category: "COMPANIES",
    action: AUDIT_ACTIONS.companyUpdate,
    entityType: "company",
    entityId: updated.id,
    entityLabel: updated.name,
    // Alleen wélke velden veranderden, niet de ingevulde waarden.
    metadata: {
      velden: changedCompanyFields(current, updated),
      btwIdentiteitGewijzigd: vatIdentityChanged,
    },
  });
  return updated;
}

/** Namen van de gewijzigde velden; bewust zonder de waarden zelf. */
function changedCompanyFields(
  before: { [key: string]: unknown },
  after: { [key: string]: unknown },
): string[] {
  const tracked = [
    "name",
    "email",
    "phone",
    "website",
    "vatNumber",
    "cocNumber",
    "addressLine",
    "postalCode",
    "city",
    "country",
    "vatRate",
    "industryCode",
    "sectorCode",
    "notes",
  ];
  return tracked.filter(
    (field) => String(before[field] ?? "") !== String(after[field] ?? ""),
  );
}

function countLabel(count: number, one: string, many: string): string | null {
  if (count <= 0) return null;
  return `${count} ${count === 1 ? one : many}`;
}

function joinNlAnd(parts: string[]): string {
  if (parts.length === 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} en ${parts.at(-1)}`;
}

export async function deleteCompany(id: string) {
  const current = await getCompany(id);
  const prisma = getPrismaClient();
  const [quotes, orders, invoices] = await Promise.all([
    prisma.quote.count({ where: { companyId: current.id } }),
    prisma.order.count({ where: { companyId: current.id } }),
    prisma.invoice.count({ where: { companyId: current.id } }),
  ]);

  const related = [
    countLabel(quotes, "offerte", "offertes"),
    countLabel(orders, "order", "orders"),
    countLabel(invoices, "factuur", "facturen"),
  ].filter((label): label is string => Boolean(label));

  if (related.length > 0) {
    const total = quotes + orders + invoices;
    // Een geweigerde verwijdering is ook informatie: iemand probeerde het.
    await logAuditEvent({
      eventType: "DELETE",
      category: "COMPANIES",
      action: AUDIT_ACTIONS.companyDelete,
      result: "FAILURE",
      entityType: "company",
      entityId: current.id,
      entityLabel: current.name,
      metadata: { reden: "Nog gekoppelde records", aantal: total },
    });
    throw new AppError(
      `Dit bedrijf kan niet worden verwijderd omdat er nog ${joinNlAnd(related)} aan gekoppeld ${total === 1 ? "is" : "zijn"}.`,
      "CONFLICT",
      409,
    );
  }

  await prisma.company.delete({ where: { id: current.id } });
  await logAuditEvent({
    eventType: "DELETE",
    category: "COMPANIES",
    action: AUDIT_ACTIONS.companyDelete,
    entityType: "company",
    entityId: current.id,
    entityLabel: current.name,
    severity: "NOTICE",
    metadata: { slug: current.slug, land: current.country },
  });
  return current;
}
