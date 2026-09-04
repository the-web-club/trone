import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDealCount, mockDealGroupBy } = vi.hoisted(() => ({
  mockDealCount: vi.fn(),
  mockDealGroupBy: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  getPrismaClient: () => ({
    deal: {
      count: mockDealCount,
      groupBy: mockDealGroupBy,
    },
  }),
}));

import { getDealFilterFacets } from "@/lib/deal-service";

describe("getDealFilterFacets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDealCount.mockResolvedValue(10);
    mockDealGroupBy.mockResolvedValue([]);
  });

  it("negeert de eigen dimensie: stage-facet houdt zoek/bron/eigenaar, niet de fase", async () => {
    await getDealFilterFacets(
      {
        zoeken: "stoel",
        stageId: "stage-lead",
        sourceId: "src-web",
        eigenaar: "user-42",
        status: "open",
        van: "2026-08-01",
      },
      "user-me",
    );

    const stageGroupCall = mockDealGroupBy.mock.calls.find(
      (call) => call[0]?.by?.[0] === "stageId",
    );
    expect(stageGroupCall).toBeTruthy();
    const where = JSON.stringify(stageGroupCall?.[0]?.where);
    expect(where).toContain("stoel");
    expect(where).toContain("src-web");
    expect(where).toContain("user-42");
    expect(where).toContain("OPEN");
    expect(where).not.toContain("stage-lead");
  });

  it("negeert de eigen dimensie: bron-facet houdt fase, niet de bron", async () => {
    await getDealFilterFacets({
      stageId: "stage-offerte",
      sourceId: "src-beurs",
      zoeken: "demo",
    });

    const sourceGroupCall = mockDealGroupBy.mock.calls.find(
      (call) => call[0]?.by?.[0] === "sourceId",
    );
    expect(sourceGroupCall).toBeTruthy();
    const where = JSON.stringify(sourceGroupCall?.[0]?.where);
    expect(where).toContain("stage-offerte");
    expect(where).toContain("demo");
    expect(where).not.toContain("src-beurs");
  });

  it("negeert de eigen dimensie: eigenaar-facet houdt status, niet de eigenaar", async () => {
    await getDealFilterFacets(
      {
        eigenaar: "aan-mij",
        status: "won",
        zoeken: "acme",
      },
      "user-me",
    );

    const ownerGroupCall = mockDealGroupBy.mock.calls.find(
      (call) => call[0]?.by?.[0] === "ownerUserId",
    );
    expect(ownerGroupCall).toBeTruthy();
    const where = JSON.stringify(ownerGroupCall?.[0]?.where);
    expect(where).toContain("WON");
    expect(where).toContain("acme");
    expect(where).not.toContain("aan-mij");
    expect(where).not.toContain("user-me");
  });
});
