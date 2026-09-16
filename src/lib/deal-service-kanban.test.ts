import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDealCount, mockDealFindMany, mockStageFindMany } = vi.hoisted(
  () => ({
    mockDealCount: vi.fn(),
    mockDealFindMany: vi.fn(),
    mockStageFindMany: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  getPrismaClient: () => ({
    deal: {
      count: mockDealCount,
      findMany: mockDealFindMany,
    },
    dealStage: {
      findMany: mockStageFindMany,
    },
  }),
}));

import {
  listKanbanColumnPage,
  listKanbanDeals,
} from "@/lib/deal-service";
import { KANBAN_COLUMN_PAGE_SIZE } from "@/lib/kanban-deal";

describe("listKanbanDeals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStageFindMany.mockResolvedValue([
      { id: "stage-lead" },
      { id: "stage-offerte" },
    ]);
    mockDealCount.mockResolvedValue(80);
    mockDealFindMany.mockResolvedValue([]);
  });

  it("haalt per fase max 30 leads op", async () => {
    await listKanbanDeals({ zoeken: "stoel" }, "user-me");

    expect(mockDealFindMany).toHaveBeenCalledTimes(2);
    for (const call of mockDealFindMany.mock.calls) {
      expect(call[0]?.take).toBe(KANBAN_COLUMN_PAGE_SIZE);
      expect(call[0]?.take).toBe(30);
    }
  });

  it("filtert elke kolom op de eigen fase", async () => {
    await listKanbanDeals({ status: "open" }, "user-me");

    const stageIds = mockDealFindMany.mock.calls.map(
      (call) => call[0]?.where?.AND?.[1]?.stageId,
    );
    expect(stageIds).toEqual(["stage-lead", "stage-offerte"]);
  });
});

describe("listKanbanColumnPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDealFindMany.mockResolvedValue([{ id: "deal-31" }]);
  });

  it("slaat al geladen leads over", async () => {
    await listKanbanColumnPage(
      { stageId: "stage-lead", status: "open" },
      "user-me",
      ["deal-1", "deal-2", "deal-1"],
    );

    expect(mockDealFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 30,
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { id: { notIn: ["deal-1", "deal-2"] } },
          ]),
        }),
      }),
    );
  });

  it("geeft een lege lijst zonder fase", async () => {
    const result = await listKanbanColumnPage(
      { stageId: "  " },
      "user-me",
      ["deal-1"],
    );

    expect(result.items).toEqual([]);
    expect(mockDealFindMany).not.toHaveBeenCalled();
  });
});
