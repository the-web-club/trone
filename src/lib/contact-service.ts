import "server-only";

import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { nextContactSlug } from "@/lib/entity-slug";
import { AppError } from "@/lib/errors";
import { createId, whereIdOrSlug } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import { getCompany } from "@/lib/company-service";
import {
  getContactCompanyId,
  normalizeCompanyId,
} from "@/lib/contact-company";
import type { ContactInput } from "@/lib/contact-validation";
import { effectiveSearchQuery, paginateArgs } from "@/lib/list-query";

export type ContactSelectOption = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string | null;
  companyId: string | null;
};

/** Contacten van één bedrijf. Inverse van getContactCompanyId; zie docs/DATA-MODEL.md. */
export const listContactsForSelect = cache(async function listContactsForSelect(
  companyId?: string | null,
): Promise<ContactSelectOption[]> {
  const prisma = getPrismaClient();
  const trimmed = companyId?.trim();
  return prisma.contact.findMany({
    where: trimmed ? { companyId: trimmed } : {},
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: {
      id: true,
      slug: true,
      firstName: true,
      lastName: true,
      companyId: true,
    },
  });
});

export async function listContacts() {
  const prisma = getPrismaClient();
  return prisma.contact.findMany({
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    include: { company: { select: { id: true, slug: true, name: true } } },
  });
}

export type ContactListFilters = {
  query?: string;
  companyId?: string;
  page?: number;
  pageSize?: number;
};

export async function listContactRows(filters: ContactListFilters = {}) {
  const prisma = getPrismaClient();
  const { page, pageSize, skip, take } = paginateArgs(
    filters.page,
    filters.pageSize,
  );
  const query = effectiveSearchQuery(filters.query);
  const and: Prisma.ContactWhereInput[] = [];
  if (query) {
    and.push({
      OR: [
        { firstName: { contains: query } },
        { lastName: { contains: query } },
        { email: { contains: query } },
      ],
    });
  }
  if (filters.companyId) {
    and.push({ companyId: filters.companyId });
  }
  const where = and.length ? { AND: and } : {};

  const [total, items] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      include: { company: { select: { id: true, slug: true, name: true } } },
      skip,
      take,
    }),
  ]);

  return { items, total, page, pageSize };
}

export const getContact = cache(
  async function getContact(id: string) {
    const prisma = getPrismaClient();
    const contact = await prisma.contact.findUnique({
      where: whereIdOrSlug(id),
      include: {
        company: { select: { id: true, slug: true, name: true } },
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
) {
  const nextCompanyId = normalizeCompanyId(companyId);
  if (nextCompanyId) {
    await getCompany(nextCompanyId);
  }
  const prisma = getPrismaClient();

  if (input.isPrimary && nextCompanyId) {
    await clearOtherPrimaries(nextCompanyId);
  }

  const slug = await nextContactSlug(
    prisma,
    input.firstName,
    input.lastName,
  );
  return prisma.contact.create({
    data: {
      id: createId(),
      slug,
      companyId: nextCompanyId,
      ...toContactData(input, nextCompanyId),
    },
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
  return prisma.contact.update({
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

  return prisma.contact.update({
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
