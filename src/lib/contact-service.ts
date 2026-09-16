import "server-only";

import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { nextContactSlug } from "@/lib/entity-slug";
import { AppError } from "@/lib/errors";
import { createId, whereIdOrSlug } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import { formatPersonName } from "@/lib/format";
import { getCompany, SELECT_OPTION_LIMIT } from "@/lib/company-service";
import {
  getContactCompanyId,
  normalizeCompanyId,
} from "@/lib/contact-company";
import type { ContactInput } from "@/lib/contact-validation";
import { createWithSubmissionId } from "@/lib/idempotent-create";
import { contactClassificationWhere } from "@/lib/classification-where";
import { CLASSIFICATION_FILTER_NO_COMPANY } from "@/lib/classification";
import type { ContactOwnerFacets } from "@/lib/contacts-query";
import { effectiveSearchQuery, escapeLikeTerm, paginateArgs } from "@/lib/list-query";
import { ownerFacetsFromGroups, rowsFromCountMap } from "@/lib/filters/aggregate";
import { contactFacetCountsSql } from "@/lib/filters/facet-sql";
import { contactWhereSql } from "@/lib/filters/sql-where";

export type ContactSelectOption = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string | null;
  companyId: string | null;
};

const contactSelectOptionFields = {
  id: true,
  slug: true,
  firstName: true,
  lastName: true,
  companyId: true,
} satisfies Prisma.ContactSelect;

/**
 * Contacten van één bedrijf. Inverse van getContactCompanyId; zie
 * docs/DATA-MODEL.md.
 *
 * Met `companyId` is dit van nature begrensd (contacten van één bedrijf).
 * Zonder `companyId` is er een harde `take`, want dit ging eerder als
 * volledige tabel de RSC-payload in.
 */
export const listContactsForSelect = cache(async function listContactsForSelect(
  companyId?: string | null,
): Promise<ContactSelectOption[]> {
  const prisma = getPrismaClient();
  const trimmed = companyId?.trim();
  return prisma.contact.findMany({
    where: trimmed ? { companyId: trimmed } : {},
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: contactSelectOptionFields,
    take: trimmed ? CONTACTS_PER_COMPANY_LIMIT : SELECT_OPTION_LIMIT,
  });
});

export async function listContacts() {
  const prisma = getPrismaClient();
const CONTACTS_PER_COMPANY_LIMIT = 200;
const CONTACT_SELECT_MAX = 100;

/** Zie `searchCompaniesForSelect`; zelfde contract voor contacten. */
export async function searchContactsForSelect(options?: {
  query?: string;
  companyId?: string | null;
  take?: number;
  includeIds?: readonly string[];
}): Promise<ContactSelectOption[]> {
  const prisma = getPrismaClient();
  const take = Math.min(
    Math.max(options?.take ?? SELECT_OPTION_LIMIT, 1),
    CONTACT_SELECT_MAX,
  );
  const query = options?.query?.trim();
  const companyId = options?.companyId?.trim();
  const includeIds = [...new Set(options?.includeIds?.filter(Boolean) ?? [])];

  const and: Prisma.ContactWhereInput[] = [];
  if (companyId) and.push({ companyId });
  if (query) {
    const term = escapeLikeTerm(query);
    and.push({
      OR: [
        { firstName: { contains: term } },
        { lastName: { contains: term } },
        { email: { contains: term } },
      ],
    });
  }

  const [matches, pinned] = await Promise.all([
    prisma.contact.findMany({
      where: and.length ? { AND: and } : {},
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: contactSelectOptionFields,
      take,
    }),
    includeIds.length > 0
      ? prisma.contact.findMany({
          where: { id: { in: includeIds.slice(0, CONTACT_SELECT_MAX) } },
          select: contactSelectOptionFields,
        })
      : Promise.resolve([]),
  ]);

  const byId = new Map<string, ContactSelectOption>();
  for (const row of pinned) byId.set(row.id, row);
  for (const row of matches) byId.set(row.id, row);
  return [...byId.values()].sort((a, b) =>
    `${a.firstName} ${a.lastName ?? ""}`.localeCompare(
      `${b.firstName} ${b.lastName ?? ""}`,
      "nl",
    ),
  );
}

  return prisma.contact.findMany({
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    include: { company: { select: { id: true, slug: true, name: true } } },
  });
}

export type ContactListFilters = {
  query?: string;
  companyId?: string;
  eigenaar?: string;
  industries?: string[];
  sectors?: string[];
  applications?: string[];
  page?: number;
  pageSize?: number;
};

const NO_MATCH_ID = "__no_match__";

export function buildContactListWhere(
  filters: ContactListFilters,
  currentUserId?: string,
): Prisma.ContactWhereInput {
  const and: Prisma.ContactWhereInput[] = [];
  const query = effectiveSearchQuery(filters.query);
  if (query) {
    and.push({
      OR: [
    const term = escapeLikeTerm(query);
        { firstName: { contains: term } },
        { lastName: { contains: term } },
        { email: { contains: term } },
      ],
    });
  }
  if (filters.companyId === CLASSIFICATION_FILTER_NO_COMPANY) {
    and.push({ companyId: null });
  } else if (filters.companyId) {
    and.push({ companyId: filters.companyId });
  }

  const eigenaar = filters.eigenaar?.trim() || "alle";
  if (eigenaar === "aan-mij") {
    and.push({ ownerUserId: currentUserId ?? NO_MATCH_ID });
  } else if (eigenaar === "niet-toegewezen") {
    and.push({ ownerUserId: null });
  } else if (eigenaar !== "alle") {
    and.push({ ownerUserId: eigenaar });
  }

  const classification = contactClassificationWhere({
    industries: filters.industries ?? [],
    sectors: filters.sectors ?? [],
    applications: filters.applications ?? [],
  });
  if (classification) and.push(classification);

  return and.length ? { AND: and } : {};
}

export async function listContactRows(
  filters: ContactListFilters = {},
  currentUserId?: string,
) {
  const prisma = getPrismaClient();
  const { page, pageSize, skip, take } = paginateArgs(
    filters.page,
    filters.pageSize,
  );
  const where = buildContactListWhere(filters, currentUserId);

  const [total, items] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        slug: true,
        firstName: true,
        lastName: true,
        email: true,
        ownerUserId: true,
        company: {
          select: {
            id: true,
            slug: true,
            name: true,
            industryCode: true,
            sectorCode: true,
          },
        },
      },
      skip,
      take,
    }),
  ]);

  return { items, total, page, pageSize };
}

export async function getContactOwnerFacets(
  filters: ContactListFilters = {},
  currentUserId?: string,
): Promise<ContactOwnerFacets> {
  const prisma = getPrismaClient();
  const rows = await prisma.$queryRaw<
    Array<{ value: string | null; n: bigint | number }>
  >(
    Prisma.sql`SELECT ct.ownerUserId AS value, COUNT(*) AS n FROM contact ct
                WHERE ${contactWhereSql({ ...filters, eigenaar: "alle" }, currentUserId)}
                GROUP BY ct.ownerUserId`,
  );
  return ownerFacetsFromGroups(
    rows.map((row) => ({
      ownerUserId: row.value,
      _count: { _all: Number(row.n) },
    })),
    currentUserId,
  );
}

export type ContactFilterFacets = ContactOwnerFacets & {
  /** Alleen bedrijven met contacten; label komt mee uit de facetquery. */
  byCompany: Array<{ value: string; label: string; count: number }>;
  unassignedCompany: number;
  companyTotal: number;
  byIndustry: Array<{ value: string; count: number }>;
  bySector: Array<{ value: string; count: number }>;
  byApplication: Array<{ value: string; count: number }>;
  classificationStale: boolean;
};

export async function getContactFilterFacets(
  filters: ContactListFilters = {},
/**
 * Alle contactfacetten in één gebundelde set aggregatiequery's.
 *
 * Eerder haalde de toepassing-facet elk contact met al zijn leads en
 * toepassingen op om in JS unieke contacten te tellen. Op 14.000 contacten
 * was dat de duurste query van de hele app. Nu telt de database met
 * COUNT(DISTINCT) en komen er alleen groepsrijen terug.
 */
  currentUserId?: string,
): Promise<ContactFilterFacets> {
  const facets = await contactFacetCountsSql({
    company: contactWhereSql({ ...filters, companyId: undefined }, currentUserId),
    owner: contactWhereSql({ ...filters, eigenaar: "alle" }, currentUserId),
    industry: contactWhereSql({ ...filters, industries: [] }, currentUserId),
    sector: contactWhereSql({ ...filters, sectors: [] }, currentUserId),
    application: contactWhereSql(
      { ...filters, applications: [] },
      currentUserId,
    ),
  }).catch(() => null);

  if (!facets) {
    return {
      ownerTotal: 0,
      unassignedOwner: 0,
      assignedToMe: 0,
      byOwner: [],
      byCompany: [],
      unassignedCompany: 0,
      companyTotal: 0,
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
    companyTotal: facets.companyTotal,
    unassignedCompany: facets.unassignedCompany,
    byCompany: facets.company,
    byIndustry: rowsFromCountMap(facets.industry),
    bySector: rowsFromCountMap(facets.sector),
    byApplication: rowsFromCountMap(facets.application),
    classificationStale: false,
  };
}

export const getContact = cache(
  async function getContact(id: string) {
    const prisma = getPrismaClient();
    const contact = await prisma.contact.findUnique({
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
        deals: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            stage: { select: { name: true, isWon: true, isLost: true } },
          },
        },
      },
    });
    if (!contact) {
      throw new AppError("Contact niet gevonden.", "NOT_FOUND", 404);
    }
    return contact;
  },
);

function toContactData(input: ContactInput, companyId: string | null) {
  return {
    firstName: input.firstName,
    lastName: input.lastName ?? null,
    jobTitle: input.jobTitle ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    notes: input.notes ?? null,
    isPrimary: Boolean(input.isPrimary && companyId),
  };
}

async function clearOtherPrimaries(companyId: string, exceptId?: string) {
  const prisma = getPrismaClient();
  await prisma.contact.updateMany({
    where: {
      companyId,
      isPrimary: true,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    data: { isPrimary: false },
  });
}

export async function createContact(
  companyId: string | null | undefined,
  input: ContactInput,
  ownerUserId?: string,
  options?: { submissionId?: string },
) {
  const nextCompanyId = normalizeCompanyId(companyId);
  if (nextCompanyId) {
    await getCompany(nextCompanyId);
  }
  const prisma = getPrismaClient();

  return createWithSubmissionId({
    submissionId: options?.submissionId,
    findExisting: (submissionId) =>
      prisma.contact.findUnique({ where: { submissionId } }),
    matches: (existing) =>
      existing.firstName === input.firstName &&
      (existing.lastName ?? null) === (input.lastName ?? null) &&
      (existing.companyId ?? null) === nextCompanyId,
    create: async () => {
      if (input.isPrimary && nextCompanyId) {
        await clearOtherPrimaries(nextCompanyId);
      }
      const slug = await nextContactSlug(
        prisma,
        input.firstName,
        input.lastName,
      );
      const contact = await prisma.contact.create({
        data: {
          id: createId(),
          slug,
          submissionId: options?.submissionId ?? null,
          companyId: nextCompanyId,
          ownerUserId: ownerUserId ?? null,
          ...toContactData(input, nextCompanyId),
        },
      });
    },
  });
}

export async function setContactOwner(id: string, ownerUserId: string | null) {
  const contact = await getContact(id);
  const nextOwnerId = ownerUserId?.trim() || null;
  if (contact.ownerUserId === nextOwnerId) return contact;

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

  const updated = await prisma.contact.update({
    where: { id: contact.id },
    data: { ownerUserId: nextOwnerId },
  });
}

export async function updateContact(
  id: string,
  companyId: string | null,
  input: ContactInput,
) {
  const contact = await getContact(id);
  const expectedCompanyId = normalizeCompanyId(companyId);
  if (getContactCompanyId(contact) !== expectedCompanyId) {
    throw new AppError("Contact niet gevonden.", "NOT_FOUND", 404);
  }

  if (input.isPrimary && expectedCompanyId) {
    await clearOtherPrimaries(expectedCompanyId, contact.id);
  }

  const prisma = getPrismaClient();
  const slug = await nextContactSlug(
    prisma,
    input.firstName,
    input.lastName,
    contact.id,
  );
  const updated = await prisma.contact.update({
    where: { id: contact.id },
    data: {
      ...toContactData(input, expectedCompanyId),
      slug,
    },
  });
}

export async function setContactCompany(
  id: string,
  companyId: string | null | undefined,
) {
  const contact = await getContact(id);
  const nextCompanyId = normalizeCompanyId(companyId);
  const currentCompanyId = getContactCompanyId(contact);
  if (nextCompanyId === currentCompanyId) return contact;

  if (nextCompanyId) {
    await getCompany(nextCompanyId);
  }

  const prisma = getPrismaClient();
  const dealMismatch = nextCompanyId
    ? { OR: [{ companyId: null }, { companyId: { not: nextCompanyId } }] }
    : { companyId: { not: null } };
  const billedMismatch = nextCompanyId
    ? { companyId: { not: nextCompanyId } }
    : {};
  const [dealCount, quoteCount, orderCount] = await Promise.all([
    prisma.deal.count({
      where: { contactId: contact.id, ...dealMismatch },
    }),
    prisma.quote.count({
      where: { contactId: contact.id, ...billedMismatch },
    }),
    prisma.order.count({
      where: { contactId: contact.id, ...billedMismatch },
    }),
  ]);
  if (dealCount + quoteCount + orderCount > 0) {
    throw new AppError(
      "Dit contact is gekoppeld aan een lead, offerte of order met een ander bedrijf. Pas die koppeling eerst aan.",
      "VALIDATION",
    );
  }

  const isPrimary = nextCompanyId ? contact.isPrimary : false;
  if (isPrimary && nextCompanyId) {
    await clearOtherPrimaries(nextCompanyId, contact.id);
  }

  const updated = await prisma.contact.update({
    where: { id: contact.id },
    data: {
      companyId: nextCompanyId,
      isPrimary,
    },
  });
}

export async function deleteContact(id: string) {
  const current = await getContact(id);
  const prisma = getPrismaClient();
  await prisma.contact.delete({ where: { id: current.id } });
  return current;
}
