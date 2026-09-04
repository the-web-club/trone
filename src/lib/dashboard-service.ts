import "server-only";

import { getPrismaClient } from "@/lib/db";

export async function getDashboardCounts() {
  const prisma = getPrismaClient();
  const [companies, deals, orders, stages, openByStage] = await Promise.all([
    prisma.company.count(),
    prisma.deal.count(),
    prisma.order.count(),
    prisma.dealStage.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.deal.groupBy({
      by: ["stageId"],
      where: { status: "OPEN" },
      _count: { id: true },
    }),
  ]);

  const countByStage = new Map(
    openByStage.map((row) => [row.stageId, row._count.id]),
  );

  return {
    companies,
    deals,
    orders,
    openDealsByStage: stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      count: countByStage.get(stage.id) ?? 0,
    })),
  };
}
