import "server-only";

import { getPrismaClient } from "@/lib/db";

export async function getDashboardCounts() {
  const prisma = getPrismaClient();
  const [companies, deals, orders] = await Promise.all([
    prisma.company.count(),
    prisma.deal.count(),
    prisma.order.count(),
  ]);
  return { companies, deals, orders };
}
