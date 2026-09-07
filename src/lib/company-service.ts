import "server-only";

import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { nextCompanySlug } from "@/lib/entity-slug";
import { AppError } from "@/lib/errors";
import { createId, whereIdOrSlug } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import type { CompanyInput } from "@/lib/company-validation";
import { paginateArgs, type PagedList } from "@/lib/list-query";

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
  return prisma.company.update({
    where: { id: current.id },
    data: {
      ...toCompanyData(input),
      slug,
    },
  });
}
