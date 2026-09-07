import "server-only";

import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { nextCompanySlug } from "@/lib/entity-slug";
import { AppError } from "@/lib/errors";
import { createId, whereIdOrSlug } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import type { CompanyInput } from "@/lib/company-validation";
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
  page?: number;
  pageSize?: number;
};

function buildCompanyListWhere(
  filters: CompanyListFilters,
): Prisma.CompanyWhereInput {
  const and: Prisma.CompanyWhereInput[] = [];
  const query = filters.query?.trim();
  if (query) and.push({ name: { contains: query } });
  if (filters.city?.trim()) and.push({ city: filters.city.trim() });
  if (filters.country?.trim()) and.push({ country: filters.country.trim() });
  return and.length ? { AND: and } : {};
}

export async function listCompanyRows(
  filters: CompanyListFilters = {},
): Promise<
  PagedList<{
    id: string;
    slug: string;
    name: string;
    city: string | null;
    country: string;
    _count: { contacts: number };
  }>
> {
  const prisma = getPrismaClient();
  const where = buildCompanyListWhere(filters);
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
        _count: { select: { contacts: true } },
      },
      skip,
      take,
    }),
  ]);

  return { items, total, page, pageSize };
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
