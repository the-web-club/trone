import "server-only";

import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import {
  endExclusiveOfCalendarDate,
  normalizeDateOnlyInput,
  startOfCalendarDate,
} from "@/lib/date-input";
import { getPrismaClient } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createId, whereIdOrOrderNumber } from "@/lib/id";
import { paginateArgs, type PagedList } from "@/lib/list-query";
import { nextNumber, SEQ_ORDER_2026 } from "@/lib/number-sequence-service";
import type { CreateOrderFromQuoteInput, OrderStatusInput } from "@/lib/order-validation";
import { orderStatusLabels } from "@/lib/orders-query";
import { getQuote } from "@/lib/quote-service";
import { assertContactBelongsToCompany } from "@/lib/contact-company";
import { logEvent } from "@/lib/timeline-service";

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
    company: { id: string; slug: string; name: string };
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
      include: { company: { select: { id: true, slug: true, name: true } } },
      skip,
      take,
    }),
  ]);

  return { items, total, page, pageSize };
}

const orderDetailInclude = {
  company: { select: { id: true, slug: true, name: true, vatRate: true } },
  contact: { select: { id: true, slug: true, firstName: true, lastName: true } },
  quote: { select: { id: true, quoteNumber: true, status: true } },
  deal: { select: { id: true, slug: true, title: true } },
  items: { orderBy: { sortOrder: "asc" as const } },
} as const;

export async function getOrder(id: string) {
  const prisma = getPrismaClient();
  const order = await prisma.order.findUnique({
    where: whereIdOrOrderNumber(id),
    include: orderDetailInclude,
  });
  if (!order) {
    throw new AppError("Order niet gevonden.", "NOT_FOUND", 404);
  }
  return order;
}

export async function findOrderByQuoteId(quoteId: string) {
  const prisma = getPrismaClient();
  return prisma.order.findFirst({
    where: { quoteId },
    orderBy: { createdAt: "asc" },
    select: { id: true, orderNumber: true, status: true },
  });
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function totalsFromFrozenLines(
  items: {
    quantity: number;
    unitPrice: Prisma.Decimal | number;
    lineDiscountPct: Prisma.Decimal | number;
    lineTotal: Prisma.Decimal | number;
  }[],
) {
  let subtotal = 0;
  let discountTotal = 0;
  let total = 0;
  for (const item of items) {
    const quantity = item.quantity;
    const unitNet = Number(item.unitPrice);
    const discountPercent = Number(item.lineDiscountPct);
    const lineTotal = Number(item.lineTotal);
    const unitSubtotal =
      discountPercent > 0 && discountPercent < 100
        ? round2(unitNet / (1 - discountPercent / 100))
        : unitNet;
    subtotal = round2(subtotal + unitSubtotal * quantity);
    discountTotal = round2(discountTotal + (unitSubtotal - unitNet) * quantity);
    total = round2(total + lineTotal);
  }
  return { subtotal, discountTotal, total };
}

export async function createOrderFromQuote(
  input: CreateOrderFromQuoteInput,
  userId?: string,
) {
  const quote = await getQuote(input.quoteId);
  if (quote.status !== "ACCEPTED") {
    throw new AppError(
      "Een order kan alleen van een geaccepteerde offerte.",
      "VALIDATION",
    );
  }
  if (quote.contact) {
    assertContactBelongsToCompany(quote.contact, quote.companyId);
  }

  const existing = await findOrderByQuoteId(quote.id);
  if (existing) {
    throw new AppError(
      `Er bestaat al een order voor deze offerte (${existing.orderNumber}).`,
      "CONFLICT",
    );
  }

  const selected = quote.items.filter((item) =>
    input.itemIds.includes(item.id),
  );
  if (selected.length === 0) {
    throw new AppError("Selecteer minstens één offerteregel.", "VALIDATION");
  }
  if (selected.length !== input.itemIds.length) {
    throw new AppError("Een geselecteerde regel hoort niet bij deze offerte.", "VALIDATION");
  }

  const totals = totalsFromFrozenLines(selected);
  const prisma = getPrismaClient();
  const orderNumber = await nextNumber(prisma, SEQ_ORDER_2026);
  const orderId = createId();

  await prisma.$transaction(async (tx) => {
    await tx.order.create({
      data: {
        id: orderId,
        orderNumber,
        quoteId: quote.id,
        dealId: quote.dealId,
        companyId: quote.companyId,
        contactId: quote.contactId,
        status: "NEW",
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        total: totals.total,
        createdBy: userId ?? null,
        items: {
          create: selected.map((item, index) => ({
            id: createId(),
            productId: item.productId,
            configurationId: item.configurationId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineDiscountPct: item.lineDiscountPct,
            lineTotal: item.lineTotal,
            configSnapshot: item.configSnapshot as Prisma.InputJsonValue,
            sortOrder: item.sortOrder || index + 1,
          })),
        },
      },
    });
  });

  await logEvent({
    type: "ORDER_CREATED",
    body: `Order ${orderNumber} aangemaakt`,
    userId: userId ?? null,
    orderId,
    quoteId: quote.id,
    dealId: quote.dealId,
    contactId: quote.contactId,
    companyId: quote.companyId,
  });

  return getOrder(orderId);
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatusInput,
  userId?: string,
) {
  const current = await getOrder(id);
  const prisma = getPrismaClient();
  const updated = await prisma.order.update({
    where: { id },
    data: { status },
    include: orderDetailInclude,
  });

  if (current.status !== status) {
    await logEvent({
      type: "ORDER_STATUS",
      body: `Order ${current.orderNumber}: status ${orderStatusLabels[current.status]} → ${orderStatusLabels[status]}`,
      userId: userId ?? null,
      orderId: id,
      quoteId: current.quoteId,
      dealId: current.dealId,
      contactId: current.contactId,
      companyId: current.companyId,
    });
  }

  return updated;
}
