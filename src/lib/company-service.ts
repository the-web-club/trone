import "server-only";

import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { nextCompanySlug } from "@/lib/entity-slug";
import { AppError } from "@/lib/errors";
import { createId, whereIdOrSlug } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import type { CompanyInput } from "@/lib/company-validation";
import {
  parseCompanyLeadsFilter,
  type CompanyLeadFacets,
  type CompanyLeadsFilter,
  type CompanyOwnerFacets,
} from "@/lib/companies-query";
import { paginateArgs, type PagedList } from "@/lib/list-query";
import { checkViesVatNumber } from "@/lib/vies-service";
import { resolveVatTreatment } from "@/lib/vat";

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

export async function listCompaniesForSelect(): Promise<
  Array<{ id: string; slug: string; name: string }>
> {
  const prisma = getPrismaClient();
  return prisma.company.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true },
  });
}

export type CompanyListFilters = {
  query?: string;
  city?: string;
  country?: string;
  eigenaar?: string;
  leads?: string;
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
  if (query) and.push({ name: { contains: query } });
  if (filters.city?.trim()) and.push({ city: filters.city.trim() });
  if (filters.country?.trim()) and.push({ country: filters.country.trim() });
  return and.length ? { AND: and } : {};
}

function matchesLeadCount(
  count: number,
  leads: Exclude<CompanyLeadsFilter, "alle" | "geen">,
): boolean {
  if (leads === "5plus") return count >= 5;
  return count === Number(leads);
}

async function companyIdsWithLeadCount(
  companyWhere: Prisma.CompanyWhereInput,
  leads: Exclude<CompanyLeadsFilter, "alle" | "geen">,
): Promise<string[]> {
  const prisma = getPrismaClient();
  const groups = await prisma.deal.groupBy({
    by: ["companyId"],
    where: { companyId: { not: null }, company: companyWhere },
    _count: { _all: true },
  });

  return groups.flatMap((group) =>
    group.companyId && matchesLeadCount(group._count._all, leads)
      ? [group.companyId]
      : [],
  );
}

export async function resolveCompanyListWhere(
  filters: CompanyListFilters,
  currentUserId?: string,
): Promise<Prisma.CompanyWhereInput> {
  const where = buildCompanyListWhere(filters, currentUserId);
  const leads = parseCompanyLeadsFilter(filters.leads);
  if (leads === "alle") return where;
  if (leads === "geen") {
    return { AND: [where, { deals: { none: {} } }] };
  }

  const ids = await companyIdsWithLeadCount(where, leads);
  return {
    AND: [where, { id: { in: ids.length ? ids : [NO_MATCH_ID] } }],
  };
}

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
    _count: { contacts: number; deals: number };
  }>
> {
  const prisma = getPrismaClient();
  const where = await resolveCompanyListWhere(filters, currentUserId);
  const { page, pageSize, skip, take } = paginateArgs(
    filters.page,
    filters.pageSize,
  );

  const [total, items] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        city: true,
        country: true,
        ownerUserId: true,
        _count: { select: { contacts: true, deals: true } },
      },
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
  const ownerWhere = await resolveCompanyListWhere(
    { ...filters, eigenaar: "alle" },
    currentUserId,
  );
  const ownerGroups = await prisma.company.groupBy({
    by: ["ownerUserId"],
    where: ownerWhere,
    _count: { _all: true },
  });

  const ownerTotal = ownerGroups.reduce(
    (sum, group) => sum + group._count._all,
    0,
  );
  const unassignedOwner =
    ownerGroups.find((group) => group.ownerUserId == null)?._count._all ?? 0;

  return {
    ownerTotal,
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
  };
}

export async function getCompanyLeadFacets(
  filters: CompanyListFilters = {},
  currentUserId?: string,
): Promise<CompanyLeadFacets> {
  const prisma = getPrismaClient();
  const where = buildCompanyListWhere(
    { ...filters, leads: "alle" },
    currentUserId,
  );

  const [total, none, groups] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.count({
      where: { AND: [where, { deals: { none: {} } }] },
    }),
    prisma.deal.groupBy({
      by: ["companyId"],
      where: { companyId: { not: null }, company: where },
      _count: { _all: true },
    }),
  ]);

  const byCount: CompanyLeadFacets["byCount"] = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5plus": 0,
  };
  for (const group of groups) {
    if (!group.companyId) continue;
    const n = group._count._all;
    if (n === 1) byCount["1"] += 1;
    else if (n === 2) byCount["2"] += 1;
    else if (n === 3) byCount["3"] += 1;
    else if (n === 4) byCount["4"] += 1;
    else if (n >= 5) byCount["5plus"] += 1;
  }

  return { total, none, byCount };
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
  };
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
) {
  const prisma = getPrismaClient();
  const slug = await nextCompanySlug(prisma, input.name);
  return prisma.company.create({
    data: {
      id: createId(),
      slug,
      ...toCompanyData(input),
      ownerUserId: ownerUserId ?? null,
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

  return prisma.company.update({
    where: { id: company.id },
    data: { ownerUserId: nextOwnerId },
  });
}

export async function updateCompany(id: string, input: CompanyInput) {
  const current = await getCompany(id);
  const prisma = getPrismaClient();
  const slug = await nextCompanySlug(prisma, input.name, current.id);
  const vatIdentityChanged =
    (input.vatNumber ?? null) !== (current.vatNumber ?? null) ||
    input.country !== current.country;
  return prisma.company.update({
    where: { id: current.id },
    data: {
      ...toCompanyData(input),
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
    throw new AppError(
      `Dit bedrijf kan niet worden verwijderd omdat er nog ${joinNlAnd(related)} aan gekoppeld ${total === 1 ? "is" : "zijn"}.`,
      "CONFLICT",
      409,
    );
  }

  await prisma.company.delete({ where: { id: current.id } });
  return current;
}
