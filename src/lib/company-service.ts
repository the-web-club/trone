import "server-only";

import { AppError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import type { CompanyInput } from "@/lib/company-validation";

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

export async function getCompany(id: string) {
  const prisma = getPrismaClient();
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { firstName: "asc" }],
      },
    },
  });

  if (!company) {
    throw new AppError("Bedrijf niet gevonden.", "NOT_FOUND", 404);
  }

  return company;
}

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
  return prisma.company.create({
    data: {
      id: createId(),
      ...toCompanyData(input),
      ownerUserId: ownerUserId ?? null,
    },
  });
}

export async function updateCompany(id: string, input: CompanyInput) {
  await getCompany(id);
  const prisma = getPrismaClient();
  return prisma.company.update({
    where: { id },
    data: toCompanyData(input),
  });
}
