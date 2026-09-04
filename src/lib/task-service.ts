import "server-only";

import type { Prisma, TaskStatus } from "@/generated/prisma/client";
import {
  endExclusiveOfCalendarDate,
  normalizeDateOnlyInput,
  startOfCalendarDate,
} from "@/lib/date-input";
import { AppError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { paginateArgs, type PagedList } from "@/lib/list-query";
import { logEvent } from "@/lib/timeline-service";
import type { TaskInput } from "@/lib/task-validation";
import type { TaskScope, TaskStatusFilter } from "@/lib/tasks-query";

const taskInclude = {
  assignee: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  deal: { select: { id: true, title: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  company: { select: { id: true, name: true } },
} satisfies Prisma.TaskInclude;

export type TaskRecord = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export type TaskListFilters = {
  query?: string;
  scope?: TaskScope;
  status?: TaskStatusFilter;
  van?: string;
  tot?: string;
  dealId?: string;
  contactId?: string;
  companyId?: string;
  page?: number;
  pageSize?: number;
  currentUserId: string;
};

function statusFilterToEnum(status?: TaskStatusFilter): TaskStatus | null {
  if (status === "open") return "OPEN";
  if (status === "done") return "DONE";
  if (status === "cancelled") return "CANCELLED";
  return null;
}

async function resolveTaskLinks(input: {
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
}) {
  const prisma = getPrismaClient();
  const dealId = input.dealId ?? null;
  let contactId = input.contactId ?? null;
  let companyId = input.companyId ?? null;

  if (dealId) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      select: { id: true, contactId: true, companyId: true },
    });
    if (!deal) {
      throw new AppError("Lead niet gevonden.", "NOT_FOUND", 404);
    }
    contactId = contactId ?? deal.contactId;
    companyId = companyId ?? deal.companyId;
  }

  if (contactId) {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { id: true, companyId: true },
    });
    if (!contact) {
      throw new AppError("Contact niet gevonden.", "NOT_FOUND", 404);
    }
    companyId = companyId ?? contact.companyId;
  }

  if (companyId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!company) {
      throw new AppError("Bedrijf niet gevonden.", "NOT_FOUND", 404);
    }
  }

  return { dealId, contactId, companyId };
}

function dueAtFromInput(value?: string) {
  const date = normalizeDateOnlyInput(value);
  return date ? startOfCalendarDate(date) : null;
}

export async function listActiveAssignees() {
  const prisma = getPrismaClient();
  return prisma.user.findMany({
    where: { isActive: true, OR: [{ banned: false }, { banned: null }] },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getTask(id: string) {
  const prisma = getPrismaClient();
  const task = await prisma.task.findUnique({
    where: { id },
    include: taskInclude,
  });
  if (!task) {
    throw new AppError("Taak niet gevonden.", "NOT_FOUND", 404);
  }
  return task;
}

export async function listTasks(
  filters: TaskListFilters,
): Promise<PagedList<TaskRecord>> {
  const prisma = getPrismaClient();
  const { page, pageSize, skip, take } = paginateArgs(
    filters.page,
    filters.pageSize,
  );
  const and: Prisma.TaskWhereInput[] = [];

  if (filters.scope === "door-mij") {
    and.push({ createdByUserId: filters.currentUserId });
  } else if (filters.scope !== "alle") {
    and.push({ assigneeUserId: filters.currentUserId });
  }

  const status = statusFilterToEnum(filters.status);
  if (status) and.push({ status });

  const query = filters.query?.trim();
  if (query) {
    and.push({
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
      ],
    });
  }

  if (filters.dealId) and.push({ dealId: filters.dealId });
  if (filters.contactId) and.push({ contactId: filters.contactId });
  if (filters.companyId) and.push({ companyId: filters.companyId });

  const van = normalizeDateOnlyInput(filters.van);
  const tot = normalizeDateOnlyInput(filters.tot);
  if (van || tot) {
    const dueAt: Prisma.DateTimeFilter = {};
    if (van) dueAt.gte = startOfCalendarDate(van);
    if (tot) dueAt.lt = endExclusiveOfCalendarDate(tot);
    and.push({ dueAt });
  }

  const where = and.length ? { AND: and } : {};
  const [total, items] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
  ]);

  return { items, total, page, pageSize };
}

export async function listOpenTasksForEntity(links: {
  dealId?: string;
  contactId?: string;
  companyId?: string;
}) {
  const prisma = getPrismaClient();
  const or: Prisma.TaskWhereInput[] = [];
  if (links.dealId) or.push({ dealId: links.dealId });
  if (links.contactId) or.push({ contactId: links.contactId });
  if (links.companyId) or.push({ companyId: links.companyId });
  if (or.length === 0) return [];

  return prisma.task.findMany({
    where: { status: "OPEN", OR: or },
    include: taskInclude,
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: 20,
  });
}

export async function createTask(input: TaskInput, createdByUserId: string) {
  const prisma = getPrismaClient();
  const assignee = await prisma.user.findUnique({
    where: { id: input.assigneeUserId },
    select: { id: true, isActive: true },
  });
  if (!assignee || !assignee.isActive) {
    throw new AppError("Medewerker niet gevonden.", "NOT_FOUND", 404);
  }

  const links = await resolveTaskLinks(input);
  const dueAt = dueAtFromInput(input.dueAt);
  const id = createId();

  const task = await prisma.task.create({
    data: {
      id,
      title: input.title,
      description: input.description ?? null,
      dueAt,
      priority: input.priority ?? null,
      assigneeUserId: input.assigneeUserId,
      createdByUserId,
      ...links,
    },
    include: taskInclude,
  });

  if (dueAt) {
    await logEvent({
      type: "TASK_DUE",
      body: `Taak gepland: ${task.title} (uiterlijk ${formatDate(dueAt)})`,
      userId: createdByUserId,
      dealId: links.dealId,
      contactId: links.contactId,
      companyId: links.companyId,
    });
  }

  return task;
}

export async function updateTask(id: string, input: TaskInput) {
  const current = await getTask(id);
  const prisma = getPrismaClient();
  const assignee = await prisma.user.findUnique({
    where: { id: input.assigneeUserId },
    select: { id: true, isActive: true },
  });
  if (!assignee || !assignee.isActive) {
    throw new AppError("Medewerker niet gevonden.", "NOT_FOUND", 404);
  }

  const links = await resolveTaskLinks(input);
  return prisma.task.update({
    where: { id: current.id },
    data: {
      title: input.title,
      description: input.description ?? null,
      dueAt: dueAtFromInput(input.dueAt),
      priority: input.priority ?? null,
      assigneeUserId: input.assigneeUserId,
      ...links,
    },
    include: taskInclude,
  });
}

export async function completeTask(id: string, userId?: string) {
  const current = await getTask(id);
  if (current.status === "DONE") return current;

  const prisma = getPrismaClient();
  const task = await prisma.task.update({
    where: { id },
    data: { status: "DONE", completedAt: new Date() },
    include: taskInclude,
  });

  await logEvent({
    type: "TASK_DONE",
    body: `Taak afgerond: ${task.title}`,
    userId: userId ?? null,
    dealId: task.dealId,
    contactId: task.contactId,
    companyId: task.companyId,
  });

  return task;
}
