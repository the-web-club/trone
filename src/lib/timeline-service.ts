import "server-only";

import type {
  Prisma,
  TimelineDirection,
  TimelineEventType,
  TimelineOutcome,
} from "@/generated/prisma/client";
import { logAuditEvent } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/registry";
import { AppError } from "@/lib/errors";
import { formatDate, formatDateTime } from "@/lib/format";
import { createId } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import { ACTIVITY_FEED_CAP } from "@/lib/list-query";
import { getContactCompanyId } from "@/lib/contact-company";
import type { FollowUpInput } from "@/lib/task-validation";
import {
  isManualTimelineType,
  timelineEventTypeLabels,
  type ManualTimelineType,
} from "@/lib/timeline-validation";
import {
  timelineWhereForCompany,
  timelineWhereForContact,
  timelineWhereForDeal,
} from "@/lib/timeline-where";

const timelineInclude = {
  user: { select: { id: true, name: true, image: true, slug: true } },
  quote: { select: { id: true, quoteNumber: true } },
  order: { select: { id: true, orderNumber: true } },
  deal: { select: { id: true, slug: true, title: true } },
  contact: { select: { id: true, slug: true, firstName: true, lastName: true } },
  company: { select: { id: true, slug: true, name: true } },
} satisfies Prisma.TimelineEventInclude;

export type TimelineEventRecord = Prisma.TimelineEventGetPayload<{
  include: typeof timelineInclude;
}>;

export type LogEventInput = {
  type: TimelineEventType;
  body?: string | null;
  occurredAt?: Date;
  direction?: TimelineDirection | null;
  outcome?: TimelineOutcome | null;
  userId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  quoteId?: string | null;
  orderId?: string | null;
  followUp?: FollowUpInput | null;
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
    companyId = companyId ?? getContactCompanyId(contact);
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
  const occurredAt = input.occurredAt ?? new Date();
  const followUp = input.followUp;
  if (followUp && !input.userId) {
    throw new AppError(
      "Een vervolgactie vereist een ingelogde gebruiker.",
      "VALIDATION",
    );
  }

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.timelineEvent.create({
      data: {
        id: createId(),
        type: input.type,
        body: input.body?.trim() ? input.body.trim() : null,
        occurredAt,
        direction: input.direction ?? null,
        outcome: input.outcome ?? null,
        userId: input.userId ?? null,
        ...links,
      },
      include: timelineInclude,
    });

    if (followUp && input.userId) {
      await tx.task.create({
        data: {
          id: createId(),
          title: followUp.title.trim(),
          kind: followUp.kind,
          dueAt: followUp.dueAt,
          dueDateOnly: followUp.dueDateOnly,
          status: "OPEN",
          assigneeUserId: input.userId,
          createdByUserId: input.userId,
          dealId: links.dealId,
          contactId: links.contactId,
          companyId: links.companyId,
          sourceEventId: created.id,
        },
      });
      const dueLabel = followUp.dueDateOnly
        ? formatDate(followUp.dueAt)
        : formatDateTime(followUp.dueAt);
      await tx.timelineEvent.create({
        data: {
          id: createId(),
          type: "TASK_DUE",
          body: `${followUp.title.trim()} — ${dueLabel}`,
          occurredAt,
          userId: input.userId,
          ...links,
        },
      });
    }

    return created;
  });

  // Deze functie loopt ook mee als neveneffect van fase-, offerte- en
  // orderwijzigingen, dus komt er een event bij naast dat van de bovenliggende
  // actie. `body` bevat gespreksnotities en e-mailteksten en blijft daarom
  // volledig buiten het log; alleen enums en gekoppelde id's gaan mee.
  await logAuditEvent({
    eventType: "CREATE",
    category: "DATA",
    action: AUDIT_ACTIONS.timelineCreate,
    entityType: "timelineEvent",
    entityId: event.id,
    entityLabel: timelineEventTypeLabels[event.type],
    metadata: {
      type: event.type,
      richting: event.direction,
      uitkomst: event.outcome,
      dealId: event.dealId,
      contactId: event.contactId,
      companyId: event.companyId,
    },
  });
  return event;
}

export async function getTimelineEvent(id: string) {
  const prisma = getPrismaClient();
  const event = await prisma.timelineEvent.findUnique({
    where: { id },
    include: timelineInclude,
  });

  if (!event) {
    throw new AppError("Gebeurtenis niet gevonden.", "NOT_FOUND", 404);
  }

  return event;
}

function assertManualEvent(event: TimelineEventRecord) {
  if (!isManualTimelineType(event.type)) {
    throw new AppError(
      "Systeemgebeurtenissen kun je niet wijzigen.",
      "FORBIDDEN",
      403,
    );
  }
}

export async function updateTimelineEvent(
  id: string,
  input: { type: ManualTimelineType; body?: string },
) {
  const current = await getTimelineEvent(id);
  if (!isManualTimelineType(current.type)) {
    // Een geweigerde poging op een systeemgebeurtenis is zelf informatie.
    await logAuditEvent({
      eventType: "UPDATE",
      category: "DATA",
      action: AUDIT_ACTIONS.timelineUpdate,
      result: "FAILURE",
      entityType: "timelineEvent",
      entityId: current.id,
      entityLabel: timelineEventTypeLabels[current.type],
      metadata: { type: current.type, reden: "Systeemgebeurtenis" },
    });
  }
  assertManualEvent(current);
  const prisma = getPrismaClient();

  const nextBody = input.body?.trim() ? input.body.trim() : null;
  const updated = await prisma.timelineEvent.update({
    where: { id },
    data: {
      type: input.type,
      body: nextBody,
    },
    include: timelineInclude,
  });
  await logAuditEvent({
    eventType: "UPDATE",
    category: "DATA",
    action: AUDIT_ACTIONS.timelineUpdate,
    entityType: "timelineEvent",
    entityId: updated.id,
    entityLabel: timelineEventTypeLabels[updated.type],
    // Alleen de namen van de gewijzigde velden: de tekst van `body` mag hier
    // niet terechtkomen.
    metadata: {
      type: updated.type,
      velden: [
        ...(current.type !== updated.type ? ["type"] : []),
        ...(current.body !== nextBody ? ["body"] : []),
      ],
    },
  });
  return updated;
}

export async function deleteTimelineEvent(id: string) {
  const event = await getTimelineEvent(id);
  const prisma = getPrismaClient();
  await prisma.timelineEvent.delete({ where: { id } });
  await logAuditEvent({
    eventType: "DELETE",
    category: "DATA",
    action: AUDIT_ACTIONS.timelineDelete,
    entityType: "timelineEvent",
    entityId: event.id,
    entityLabel: timelineEventTypeLabels[event.type],
    severity: "NOTICE",
    metadata: {
      type: event.type,
      richting: event.direction,
      uitkomst: event.outcome,
      dealId: event.dealId,
      contactId: event.contactId,
      companyId: event.companyId,
    },
  });
}

async function listTimeline(where: Prisma.TimelineEventWhereInput) {
  const prisma = getPrismaClient();
  // ACTIVITY_FEED_CAP (200): newest first. Real pagination can come later.
  return prisma.timelineEvent.findMany({
    where,
    include: timelineInclude,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: ACTIVITY_FEED_CAP,
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
      companyId: getContactCompanyId(contact),
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
