import "server-only";

import { getPrismaClient } from "@/lib/db";

function toAmount(value: { toString(): string } | number | null | undefined) {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

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
      _sum: { valueEstimate: true },
    }),
  ]);

  const totalsByStage = new Map(
    openByStage.map((row) => [
      row.stageId,
      {
        count: row._count.id,
        value: toAmount(row._sum.valueEstimate),
      },
    ]),
  );

  const openDealsByStage = stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    count: totalsByStage.get(stage.id)?.count ?? 0,
    value: totalsByStage.get(stage.id)?.value ?? 0,
  }));

  return {
    companies,
    deals,
    orders,
    pipelineValue: openDealsByStage.reduce((sum, stage) => sum + stage.value, 0),
    openDealsByStage,
  };
}
