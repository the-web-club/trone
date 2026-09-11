import "server-only";

import type { Prisma, TaskStatus } from "@/generated/prisma/client";
import {
  APP_TIME_ZONE,
  calendarDateInTimeZone,
  endExclusiveOfWeekInTimeZone,
  endExclusiveOfZonedDate,
  startOfWeekInTimeZone,
  startOfZonedDate,
  todayInTimeZone,
  zonedLocalToUtc,
} from "@/lib/date-input";
import { getPrismaClient } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { formatDate, formatDateTime } from "@/lib/format";
import { createId } from "@/lib/id";
import { effectiveSearchQuery, paginateArgs, type PagedList } from "@/lib/list-query";
import {
  type TaskAssigneeFilter,
  type TaskWhenFilter,
} from "@/lib/tasks-query";
import type { FollowUpInput } from "@/lib/task-validation";
import { logEvent } from "@/lib/timeline-service";

const taskInclude = {
  assignee: { select: { id: true, name: true, image: true, slug: true } },
  createdBy: { select: { id: true, name: true, image: true, slug: true } },
  deal: { select: { id: true, slug: true, title: true } },
  contact: { select: { id: true, slug: true, firstName: true, lastName: true } },
  company: { select: { id: true, slug: true, name: true } },
} satisfies Prisma.TaskInclude;

export type TaskRecord = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export type TaskListFilters = {
  zoeken?: string;
  eigenaar?: TaskAssigneeFilter;
  afgerond?: boolean;
  ignoreStatus?: boolean;
  wanneer?: TaskWhenFilter;
  van?: string;
  tot?: string;
  page?: number;
  pageSize?: number;
};

export type CreateFollowUpTaskInput = FollowUpInput & {
  assigneeUserId: string;
  createdByUserId: string;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  sourceEventId?: string | null;
  description?: string | null;
};

function normalizeSearch(value: string | null | undefined): string | null {
  return effectiveSearchQuery(value) || null;
}

function dueBounds(now = new Date()) {
  const today = todayInTimeZone(APP_TIME_ZONE, now);
  const weekStart = startOfWeekInTimeZone(APP_TIME_ZONE, now);
  const weekEnd = endExclusiveOfWeekInTimeZone(APP_TIME_ZONE, now);
  return {
    now,
    today,
    startOfToday: startOfZonedDate(today),
    startOfTomorrow: endExclusiveOfZonedDate(today),
    startOfWeek: startOfZonedDate(weekStart),
    endOfWeek: startOfZonedDate(weekEnd),
  };
}

export function buildTaskListWhere(
  filters: TaskListFilters,
  currentUserId: string,
  now = new Date(),
): Prisma.TaskWhereInput {
  const and: Prisma.TaskWhereInput[] = [];
  const eigenaar = filters.eigenaar?.trim() || "aan-mij";
  if (eigenaar === "aan-mij") {
    and.push({ assigneeUserId: currentUserId });
  } else if (eigenaar !== "alle") {
    and.push({ assigneeUserId: eigenaar });
  }

  if (!filters.ignoreStatus) {
    and.push(
      filters.afgerond
        ? { status: { in: ["OPEN", "DONE"] } }
        : { status: "OPEN" },
    );
  }

  const search = normalizeSearch(filters.zoeken);
  if (search) {
    and.push({
      OR: [
        { title: { contains: search } },
        { company: { name: { contains: search } } },
        { contact: { firstName: { contains: search } } },
        { contact: { lastName: { contains: search } } },
        { deal: { title: { contains: search } } },
      ],
    });
  }

  const bounds = dueBounds(now);
  const wanneer = filters.wanneer ?? "alle";
  if (wanneer === "zonder-datum") {
    and.push({ dueAt: null });
  } else if (wanneer === "achterstallig") {
    and.push({
      OR: [
        { dueDateOnly: true, dueAt: { lt: bounds.startOfToday } },
        { dueDateOnly: false, dueAt: { lt: bounds.now } },
      ],
    });
  } else if (wanneer === "vandaag") {
    and.push({
      dueAt: { gte: bounds.startOfToday, lt: bounds.startOfTomorrow },
    });
  } else if (wanneer === "deze-week") {
    and.push({
      dueAt: { gte: bounds.startOfWeek, lt: bounds.endOfWeek },
    });
  } else if (wanneer === "later") {
    and.push({ dueAt: { gte: bounds.endOfWeek } });
  }

  if (filters.van) {
    const from = zonedLocalToUtc(filters.van, "00:00");
    if (from) and.push({ dueAt: { gte: from } });
  }
  if (filters.tot) {
    const until = endExclusiveOfZonedDate(filters.tot);
    and.push({ dueAt: { lt: until } });
  }

  return and.length ? { AND: and } : {};
}

export async function listTasks(
  filters: TaskListFilters,
  currentUserId: string,
): Promise<PagedList<TaskRecord>> {
  const prisma = getPrismaClient();
  const where = buildTaskListWhere(filters, currentUserId);
  const { page, pageSize, skip, take } = paginateArgs(
    filters.page,
    filters.pageSize,
  );
  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "asc" }],
      skip,
      take,
    }),
    prisma.task.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export type TaskFilterFacets = {
  assigneeTotal: number;
  assignedToMe: number;
  byAssignee: Array<{ userId: string; count: number }>;
  statusTotal: number;
  byStatus: Partial<Record<TaskStatus, number>>;
};

export async function getTaskFilterFacets(
  filters: TaskListFilters,
  currentUserId: string,
): Promise<TaskFilterFacets> {
  const prisma = getPrismaClient();
  const assigneeWhere = buildTaskListWhere(
    { ...filters, eigenaar: "alle" },
    currentUserId,
  );
  const statusWhere = buildTaskListWhere(
    { ...filters, ignoreStatus: true },
    currentUserId,
  );

  const [assigneeGroups, statusGroups] = await Promise.all([
    prisma.task.groupBy({
      by: ["assigneeUserId"],
      where: assigneeWhere,
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: statusWhere,
      _count: { _all: true },
    }),
  ]);

  const byStatus: Partial<Record<TaskStatus, number>> = {};
  for (const group of statusGroups) {
    byStatus[group.status] = group._count._all;
  }

  return {
    assigneeTotal: assigneeGroups.reduce(
      (sum, group) => sum + group._count._all,
      0,
    ),
    assignedToMe:
      assigneeGroups.find((group) => group.assigneeUserId === currentUserId)
        ?._count._all ?? 0,
    byAssignee: assigneeGroups.map((group) => ({
      userId: group.assigneeUserId,
      count: group._count._all,
    })),
    statusTotal: statusGroups.reduce((sum, group) => sum + group._count._all, 0),
    byStatus,
  };
}

export async function createFollowUpTask(input: CreateFollowUpTaskInput) {
  const prisma = getPrismaClient();
  let dealId = input.dealId ?? null;
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

  if (!dealId && !contactId && !companyId) {
    throw new AppError(
      "Koppel minstens één lead, contact of bedrijf.",
      "VALIDATION",
    );
  }

  const title = input.title.trim();
  const dueLabel = followUpDueLabel(input);

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        id: createId(),
        title,
        kind: input.kind,
        dueAt: input.dueAt,
        dueDateOnly: input.dueDateOnly,
        status: "OPEN",
        assigneeUserId: input.assigneeUserId,
        createdByUserId: input.createdByUserId,
        dealId,
        contactId,
        companyId,
        sourceEventId: input.sourceEventId ?? null,
        description: input.description ?? null,
      },
      include: taskInclude,
    });
    await tx.timelineEvent.create({
      data: {
        id: createId(),
        type: "TASK_DUE",
        body: `${title} — ${dueLabel}`,
        occurredAt: new Date(),
        userId: input.createdByUserId,
        dealId,
        contactId,
        companyId,
      },
    });
    return task;
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

export async function completeTask(id: string, userId: string) {
  const task = await getTask(id);
  if (task.status === "DONE") return task;
  const prisma = getPrismaClient();
  const updated = await prisma.task.update({
    where: { id },
    data: { status: "DONE", completedAt: new Date() },
    include: taskInclude,
  });
  if (task.dealId || task.contactId || task.companyId) {
    await logEvent({
      type: "TASK_DONE",
      body: task.title,
      userId,
      dealId: task.dealId,
      contactId: task.contactId,
      companyId: task.companyId,
    });
  }
  return updated;
}

export async function reopenTask(id: string) {
  const task = await getTask(id);
  if (task.status === "OPEN") return task;
  const prisma = getPrismaClient();
  return prisma.task.update({
    where: { id },
    data: { status: "OPEN", completedAt: null },
    include: taskInclude,
  });
}

export function isTaskOverdue(task: {
  status: TaskStatus;
  dueAt: Date | null;
  dueDateOnly: boolean;
}, now = new Date()): boolean {
  if (task.status !== "OPEN" || !task.dueAt) return false;
  if (task.dueDateOnly) {
    return (
      calendarDateInTimeZone(task.dueAt) < calendarDateInTimeZone(now)
    );
  }
  return task.dueAt.getTime() < now.getTime();
}

export function formatTaskDue(task: {
  dueAt: Date | null;
  dueDateOnly: boolean;
}): string {
  if (!task.dueAt) return "Geen datum";
  return task.dueDateOnly ? formatDate(task.dueAt) : formatDateTime(task.dueAt);
}

export function followUpDueLabel(input: FollowUpInput): string {
  return input.dueDateOnly
    ? formatDate(input.dueAt)
    : formatDateTime(input.dueAt);
}
