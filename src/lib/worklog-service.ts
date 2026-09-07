import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import type { WorkLogFilter, WorkLogInput } from "@/lib/worklog-validation";

const workLogInclude = {
  user: { select: { id: true, name: true } },
  company: { select: { id: true, slug: true, name: true } },
  order: { select: { id: true, orderNumber: true, companyId: true } },
} satisfies Prisma.WorkLogInclude;

function endOfDay(date: Date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

async function assertWorkLogRelations(input: WorkLogInput) {
  const prisma = getPrismaClient();

  if (input.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: input.companyId },
      select: { id: true },
    });
    if (!company) {
      throw new AppError("Bedrijf niet gevonden.", "NOT_FOUND", 404);
    }
  }

  if (input.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      select: { id: true, companyId: true },
    });
    if (!order) {
      throw new AppError("Order niet gevonden.", "NOT_FOUND", 404);
    }
    if (input.companyId && order.companyId !== input.companyId) {
      throw new AppError("Order hoort niet bij dit bedrijf.", "VALIDATION");
    }
  }
}

export async function createWorkLog(input: WorkLogInput, userId: string) {
  await assertWorkLogRelations(input);
  const prisma = getPrismaClient();

  return prisma.workLog.create({
    data: {
      id: createId(),
      userId,
      description: input.description,
      category: input.category,
      occurredAt: input.occurredAt ?? new Date(),
      durationMinutes: input.durationMinutes ?? null,
      companyId: input.companyId ?? null,
      orderId: input.orderId ?? null,
    },
    include: workLogInclude,
  });
}

export async function listWorkLogs(filters: WorkLogFilter = {}) {
  const prisma = getPrismaClient();
  const occurredAt: Prisma.DateTimeFilter | undefined =
    filters.from || filters.to
      ? {
          ...(filters.from ? { gte: filters.from } : {}),
          ...(filters.to ? { lte: endOfDay(filters.to) } : {}),
        }
      : undefined;

  return prisma.workLog.findMany({
    where: {
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.orderId ? { orderId: filters.orderId } : {}),
      ...(occurredAt ? { occurredAt } : {}),
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    include: workLogInclude,
  });
}

export async function getWorkLog(id: string) {
  const prisma = getPrismaClient();
  const log = await prisma.workLog.findUnique({
    where: { id },
    include: workLogInclude,
  });

  if (!log) {
    throw new AppError("Logboekitem niet gevonden.", "NOT_FOUND", 404);
  }

  return log;
}

export async function updateWorkLog(
  id: string,
  input: WorkLogInput,
  actor: { userId: string; isAdmin: boolean },
) {
  const current = await getWorkLog(id);
  if (current.userId !== actor.userId && !actor.isAdmin) {
    throw new AppError("Je mag dit logboekitem niet wijzigen.", "FORBIDDEN", 403);
  }

  await assertWorkLogRelations(input);
  const prisma = getPrismaClient();

  return prisma.workLog.update({
    where: { id },
    data: {
      description: input.description,
      category: input.category,
      occurredAt: input.occurredAt ?? current.occurredAt,
      durationMinutes: input.durationMinutes ?? null,
      companyId: input.companyId ?? null,
      orderId: input.orderId ?? null,
    },
    include: workLogInclude,
  });
}

export async function deleteWorkLog(
  id: string,
  actor: { userId: string; isAdmin: boolean },
) {
  const current = await getWorkLog(id);
  if (current.userId !== actor.userId && !actor.isAdmin) {
    throw new AppError("Je mag dit logboekitem niet verwijderen.", "FORBIDDEN", 403);
  }

  const prisma = getPrismaClient();
  await prisma.workLog.delete({ where: { id } });
}

export async function listOrdersForWorkLog(query?: string, companyId?: string) {
  const prisma = getPrismaClient();
  const trimmed = query?.trim();

  return prisma.order.findMany({
    where: {
      ...(companyId ? { companyId } : {}),
      ...(trimmed
        ? {
            OR: [
              { orderNumber: { contains: trimmed } },
              { company: { name: { contains: trimmed } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      orderNumber: true,
      companyId: true,
      company: { select: { name: true } },
    },
  });
}

export async function getOrderForWorkLog(id: string) {
  const prisma = getPrismaClient();
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      companyId: true,
      createdAt: true,
      company: { select: { id: true, name: true } },
    },
  });

  if (!order) {
    throw new AppError("Order niet gevonden.", "NOT_FOUND", 404);
  }

  return order;
}

export async function listOrdersOverview() {
  const prisma = getPrismaClient();
  return prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { id: true, name: true } },
    },
  });
}
