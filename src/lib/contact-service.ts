import "server-only";

import { AppError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import { getCompany } from "@/lib/company-service";
import type { ContactInput } from "@/lib/contact-validation";

export async function listContacts() {
  const prisma = getPrismaClient();
  return prisma.contact.findMany({
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    include: { company: { select: { id: true, name: true } } },
  });
}

export async function getContact(id: string) {
  const prisma = getPrismaClient();
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) {
    throw new AppError("Contact niet gevonden.", "NOT_FOUND", 404);
  }
  return contact;
}

function toContactData(input: ContactInput) {
  return {
    firstName: input.firstName,
    lastName: input.lastName ?? null,
    jobTitle: input.jobTitle ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    notes: input.notes ?? null,
    isPrimary: input.isPrimary,
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

export async function createContact(companyId: string, input: ContactInput) {
  await getCompany(companyId);
  const prisma = getPrismaClient();

  if (input.isPrimary) {
    await clearOtherPrimaries(companyId);
  }

  return prisma.contact.create({
    data: {
      id: createId(),
      companyId,
      ...toContactData(input),
    },
  });
}

export async function updateContact(
  id: string,
  companyId: string,
  input: ContactInput,
) {
  const contact = await getContact(id);
  if (contact.companyId !== companyId) {
    throw new AppError("Contact niet gevonden.", "NOT_FOUND", 404);
  }

  if (input.isPrimary) {
    await clearOtherPrimaries(companyId, id);
  }

  const prisma = getPrismaClient();
  return prisma.contact.update({
    where: { id },
    data: toContactData(input),
  });
}
