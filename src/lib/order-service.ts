import "server-only";

import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import {
  endExclusiveOfCalendarDate,
  normalizeDateOnlyInput,
  startOfCalendarDate,
} from "@/lib/date-input";
import { getPrismaClient } from "@/lib/db";
import { paginateArgs, type PagedList } from "@/lib/list-query";

export type OrderListFilters = {
  query?: string;
  status?: OrderStatus;
  companyId?: string;
  van?: string;
  tot?: string;
  page?: number;
  pageSize?: number;
};

export async function listOrders(
  filters: OrderListFilters = {},
): Promise<
  PagedList<{
    id: string;
    orderNumber: string;
    status: OrderStatus;
    createdAt: Date;
    company: { id: string; name: string };
  }>
> {
  const prisma = getPrismaClient();
  const query = filters.query?.trim();
  const { page, pageSize, skip, take } = paginateArgs(
    filters.page,
    filters.pageSize,
  );

  const and: Prisma.OrderWhereInput[] = [];
  if (filters.status) and.push({ status: filters.status });
  if (filters.companyId) and.push({ companyId: filters.companyId });
  if (query) {
    and.push({
      OR: [
        { orderNumber: { contains: query } },
        { company: { name: { contains: query } } },
      ],
    });
  }
  const van = normalizeDateOnlyInput(filters.van);
  const tot = normalizeDateOnlyInput(filters.tot);
  if (van || tot) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (van) createdAt.gte = startOfCalendarDate(van);
    if (tot) createdAt.lt = endExclusiveOfCalendarDate(tot);
    and.push({ createdAt });
  }

  const where = and.length ? { AND: and } : {};
  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { company: { select: { id: true, name: true } } },
      skip,
      take,
    }),
  ]);

  return { items, total, page, pageSize };
}
