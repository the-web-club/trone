import type { Prisma } from "@/generated/prisma/client";

export function timelineWhereForDeal(ids: {
  dealId: string;
  contactId?: string | null;
  companyId?: string | null;
}): Prisma.TimelineEventWhereInput {
  const or: Prisma.TimelineEventWhereInput[] = [{ dealId: ids.dealId }];
  if (ids.contactId) or.push({ contactId: ids.contactId });
  if (ids.companyId) or.push({ companyId: ids.companyId });
  return { OR: or };
}

export function timelineWhereForContact(ids: {
  contactId: string;
  dealIds: string[];
  companyId?: string | null;
}): Prisma.TimelineEventWhereInput {
  const or: Prisma.TimelineEventWhereInput[] = [{ contactId: ids.contactId }];
  if (ids.dealIds.length > 0) or.push({ dealId: { in: ids.dealIds } });
  if (ids.companyId) or.push({ companyId: ids.companyId });
  return { OR: or };
}

export function timelineWhereForCompany(ids: {
  companyId: string;
  contactIds: string[];
  dealIds: string[];
}): Prisma.TimelineEventWhereInput {
  const or: Prisma.TimelineEventWhereInput[] = [{ companyId: ids.companyId }];
  if (ids.contactIds.length > 0) or.push({ contactId: { in: ids.contactIds } });
  if (ids.dealIds.length > 0) or.push({ dealId: { in: ids.dealIds } });
  return { OR: or };
}
