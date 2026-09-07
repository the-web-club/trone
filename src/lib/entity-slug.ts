import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { allocateUniqueSlug, personSlugSource } from "@/lib/slug";

type SlugDb = PrismaClient | Prisma.TransactionClient;

export async function nextCompanySlug(
  db: SlugDb,
  name: string,
  exceptId?: string,
) {
  return allocateUniqueSlug(
    async (slug) => {
      const row = await db.company.findUnique({
        where: { slug },
        select: { id: true },
      });
      return Boolean(row && row.id !== exceptId);
    },
    name,
    "bedrijf",
  );
}

export async function nextContactSlug(
  db: SlugDb,
  firstName: string,
  lastName?: string | null,
  exceptId?: string,
) {
  return allocateUniqueSlug(
    async (slug) => {
      const row = await db.contact.findUnique({
        where: { slug },
        select: { id: true },
      });
      return Boolean(row && row.id !== exceptId);
    },
    personSlugSource(firstName, lastName),
    "contact",
  );
}

export async function nextDealSlug(
  db: SlugDb,
  title: string,
  exceptId?: string,
) {
  return allocateUniqueSlug(
    async (slug) => {
      const row = await db.deal.findUnique({
        where: { slug },
        select: { id: true },
      });
      return Boolean(row && row.id !== exceptId);
    },
    title,
    "lead",
  );
}

export async function nextUserSlug(
  db: SlugDb,
  name: string,
  exceptId?: string,
) {
  return allocateUniqueSlug(
    async (slug) => {
      const row = await db.user.findUnique({
        where: { slug },
        select: { id: true },
      });
      return Boolean(row && row.id !== exceptId);
    },
    name,
    "medewerker",
  );
}
