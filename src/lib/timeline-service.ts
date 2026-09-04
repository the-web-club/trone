import "server-only";

import type { Prisma, TimelineEventType } from "@/generated/prisma/client";
import { AppError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import {
  timelineWhereForCompany,
  timelineWhereForContact,
  timelineWhereForDeal,
} from "@/lib/timeline-where";

const timelineInclude = {
  user: { select: { id: true, name: true } },
  quote: { select: { id: true, quoteNumber: true } },
  order: { select: { id: true, orderNumber: true } },
  deal: { select: { id: true, title: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  company: { select: { id: true, name: true } },
} satisfies Prisma.TimelineEventInclude;

export type TimelineEventRecord = Prisma.TimelineEventGetPayload<{
  include: typeof timelineInclude;
}>;

export type LogEventInput = {
  type: TimelineEventType;
  body?: string | null;
  occurredAt?: Date;
  userId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  quoteId?: string | null;
  orderId?: string | null;
};

async function resolveLinks(input: LogEventInput) {
  const prisma = getPrismaClient();
  let dealId = input.dealId ?? null;
  let contactId = input.contactId ?? null;
  let companyId = input.companyId ?? null;
  let quoteId = input.quoteId ?? null;
  const orderId = input.orderId ?? null;

  if (quoteId) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: { id: true, dealId: true, contactId: true, companyId: true },
    });
    if (!quote) {
      throw new AppError("Offerte niet gevonden.", "NOT_FOUND", 404);
    }
    dealId = dealId ?? quote.dealId;
    contactId = contactId ?? quote.contactId;
    companyId = companyId ?? quote.companyId;
  }

  if (orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        quoteId: true,
        dealId: true,
        contactId: true,
        companyId: true,
      },
    });
    if (!order) {
      throw new AppError("Order niet gevonden.", "NOT_FOUND", 404);
    }
    quoteId = quoteId ?? order.quoteId;
    dealId = dealId ?? order.dealId;
    contactId = contactId ?? order.contactId;
    companyId = companyId ?? order.companyId;
  }

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

  if (!dealId && !contactId && !companyId && !quoteId && !orderId) {
    throw new AppError(
      "Koppel minstens één lead, contact of bedrijf.",
      "VALIDATION",
    );
  }

  return { dealId, contactId, companyId, quoteId, orderId };
}

export async function logEvent(input: LogEventInput) {
  const links = await resolveLinks(input);
  const prisma = getPrismaClient();

  return prisma.timelineEvent.create({
    data: {
      id: createId(),
      type: input.type,
      body: input.body?.trim() ? input.body.trim() : null,
      occurredAt: input.occurredAt ?? new Date(),
      userId: input.userId ?? null,
      ...links,
    },
    include: timelineInclude,
  });
}

async function listTimeline(where: Prisma.TimelineEventWhereInput) {
  const prisma = getPrismaClient();
  return prisma.timelineEvent.findMany({
    where,
    include: timelineInclude,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function listTimelineForDeal(dealId: string) {
  const prisma = getPrismaClient();
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { id: true, contactId: true, companyId: true },
  });
  if (!deal) {
    throw new AppError("Lead niet gevonden.", "NOT_FOUND", 404);
  }
  return listTimeline(
    timelineWhereForDeal({
      dealId: deal.id,
      contactId: deal.contactId,
      companyId: deal.companyId,
    }),
  );
}

export async function listTimelineForContact(contactId: string) {
  const prisma = getPrismaClient();
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: {
      id: true,
      companyId: true,
      deals: { select: { id: true } },
    },
  });
  if (!contact) {
    throw new AppError("Contact niet gevonden.", "NOT_FOUND", 404);
  }
  return listTimeline(
    timelineWhereForContact({
      contactId: contact.id,
      dealIds: contact.deals.map((deal) => deal.id),
      companyId: contact.companyId,
    }),
  );
}

export async function listTimelineForCompany(companyId: string) {
  const prisma = getPrismaClient();
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      contacts: { select: { id: true } },
      deals: { select: { id: true } },
    },
  });
  if (!company) {
    throw new AppError("Bedrijf niet gevonden.", "NOT_FOUND", 404);
  }
  return listTimeline(
    timelineWhereForCompany({
      companyId: company.id,
      contactIds: company.contacts.map((contact) => contact.id),
      dealIds: company.deals.map((deal) => deal.id),
    }),
  );
}
