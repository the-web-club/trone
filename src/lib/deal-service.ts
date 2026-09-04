import "server-only";

import { AppError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import type { DealActivityInput, DealInput } from "@/lib/deal-validation";
import type { DealStatus } from "@/generated/prisma/client";

export async function listDealStages() {
  const prisma = getPrismaClient();
  return prisma.dealStage.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function listLeadSources() {
  const prisma = getPrismaClient();
  return prisma.leadSource.findMany({ orderBy: { name: "asc" } });
}

export async function listDeals(filters?: { query?: string; stageId?: string }) {
  const prisma = getPrismaClient();
  const query = filters?.query?.trim();

  return prisma.deal.findMany({
    where: {
      ...(filters?.stageId ? { stageId: filters.stageId } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query } },
              { company: { name: { contains: query } } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      company: { select: { id: true, name: true } },
      stage: true,
      source: { select: { id: true, name: true } },
    },
  });
}

export async function getDeal(id: string) {
  const prisma = getPrismaClient();
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      contact: {
        select: { id: true, firstName: true, lastName: true, companyId: true },
      },
      stage: true,
      source: { select: { id: true, name: true } },
      activities: { orderBy: { occurredAt: "desc" } },
    },
  });

  if (!deal) {
    throw new AppError("Lead niet gevonden.", "NOT_FOUND", 404);
  }

  return deal;
}

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

  if (input.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: input.companyId },
    });
    if (!company) {
      throw new AppError("Bedrijf niet gevonden.", "NOT_FOUND", 404);
    }
  }

  if (input.contactId) {
    const contact = await prisma.contact.findUnique({
      where: { id: input.contactId },
    });
    if (!contact) {
      throw new AppError("Contact niet gevonden.", "NOT_FOUND", 404);
    }
    if (
      input.companyId &&
      contact.companyId &&
      contact.companyId !== input.companyId
    ) {
      throw new AppError("Contact hoort niet bij dit bedrijf.", "VALIDATION");
    }
  }

  return stage;
}

export async function createDeal(input: DealInput, ownerUserId?: string) {
  const prisma = getPrismaClient();
  const stage = await assertDealRelations(input);

  return prisma.deal.create({
    data: {
      id: createId(),
      title: input.title,
      companyId: input.companyId ?? null,
      contactId: input.contactId ?? null,
      stageId: input.stageId,
      sourceId: input.sourceId ?? null,
      valueEstimate: input.valueEstimate ?? null,
      status: statusForStage(stage),
      ownerUserId: ownerUserId ?? null,
    },
  });
}

export async function updateDeal(id: string, input: DealInput, userId?: string) {
  const current = await getDeal(id);
  const prisma = getPrismaClient();
  const stage = await assertDealRelations(input);

  const updated = await prisma.deal.update({
    where: { id },
    data: {
      title: input.title,
      companyId: input.companyId ?? null,
      contactId: input.contactId ?? null,
      stageId: input.stageId,
      sourceId: input.sourceId ?? null,
      valueEstimate: input.valueEstimate ?? null,
      status: statusForStage(stage),
    },
  });

  if (current.stageId !== input.stageId) {
    await prisma.dealActivity.create({
      data: {
        id: createId(),
        dealId: id,
        userId: userId ?? null,
        type: "STAGE_CHANGE",
        body: `Verplaatst van ${current.stage.name} naar ${stage.name}`,
      },
    });
  }

  return updated;
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
    where: { id },
    data: {
      stageId,
      status: statusForStage(stage),
    },
  });

  await prisma.dealActivity.create({
    data: {
      id: createId(),
      dealId: id,
      userId: userId ?? null,
      type: "STAGE_CHANGE",
      body: `Verplaatst van ${deal.stage.name} naar ${stage.name}`,
    },
  });

  return updated;
}

export async function addDealActivity(
  dealId: string,
  input: DealActivityInput,
  userId?: string,
) {
  await getDeal(dealId);
  const prisma = getPrismaClient();
  return prisma.dealActivity.create({
    data: {
      id: createId(),
      dealId,
      userId: userId ?? null,
      type: input.type,
      body: input.body ?? null,
    },
  });
}
