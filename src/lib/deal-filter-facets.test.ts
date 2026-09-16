import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDealCount,
  mockDealGroupBy,
  mockDealApplicationGroupBy,
  mockCompanyFindMany,
} = vi.hoisted(() => ({
  mockDealCount: vi.fn(),
  mockDealGroupBy: vi.fn(),
  mockDealApplicationGroupBy: vi.fn(),
  mockCompanyFindMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  getPrismaClient: () => ({
    deal: {
      count: mockDealCount,
      groupBy: mockDealGroupBy,
    },
    dealApplication: {
      groupBy: mockDealApplicationGroupBy,
    },
    company: {
      findMany: mockCompanyFindMany,
    },
  }),
}));

import { getDealFilterFacets } from "@/lib/deal-service";

describe("getDealFilterFacets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDealCount.mockResolvedValue(0);
    mockDealGroupBy.mockResolvedValue([]);
    mockDealApplicationGroupBy.mockResolvedValue([]);
    mockCompanyFindMany.mockResolvedValue([]);
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

  it("negeert de eigen dimensie: branche houdt status, niet de branche zelf", async () => {
    await getDealFilterFacets({
      industries: ["industrie_productie"],
      status: "open",
    });

    const industryCall = mockDealGroupBy.mock.calls.find(
      (call) => call[0]?.by?.[0] === "companyId",
    );
    expect(industryCall).toBeTruthy();
    const where = JSON.stringify(industryCall?.[0]?.where);
    expect(where).toContain("OPEN");
    expect(where).not.toContain("industrie_productie");
  });

  it("leidt scalar totalen af uit groupBy, zonder count-per-optie", async () => {
    mockDealGroupBy.mockImplementation(async (args: { by: string[] }) => {
      if (args.by[0] === "stageId") {
        return [
          { stageId: "s1", _count: { _all: 4 } },
          { stageId: "s2", _count: { _all: 6 } },
        ];
      }
      if (args.by[0] === "sourceId") {
        return [
          { sourceId: null, _count: { _all: 3 } },
          { sourceId: "src-a", _count: { _all: 7 } },
        ];
      }
      if (args.by[0] === "ownerUserId") {
        return [
          { ownerUserId: null, _count: { _all: 2 } },
          { ownerUserId: "user-me", _count: { _all: 5 } },
          { ownerUserId: "user-other", _count: { _all: 3 } },
        ];
      }
      if (args.by[0] === "leadScore") {
        return [
          {
            leadScore: null,
            leadScoreAssessed: 0,
            leadScoreNoMatch: false,
            _count: { _all: 10 },
          },
        ];
      }
      if (args.by[0] === "companyId") {
        return [
          { companyId: null, _count: { _all: 2 } },
          { companyId: "co-1", _count: { _all: 8 } },
        ];
      }
      return [
        { status: "OPEN", _count: { _all: 8 } },
        { status: "WON", _count: { _all: 2 } },
      ];
    });
    mockCompanyFindMany.mockResolvedValue([
      { id: "co-1", industryCode: "industrie_productie", sectorCode: "chemie" },
    ]);
    mockDealApplicationGroupBy.mockResolvedValue([
      { code: "kraan", _count: { _all: 4 } },
    ]);
    mockDealCount.mockResolvedValue(3);

    const facets = await getDealFilterFacets({}, "user-me");

    expect(mockDealGroupBy.mock.calls.some((call) => call[0]?.by?.[0] === "stageId")).toBe(
      true,
    );
    expect(facets.stageTotal).toBe(10);
    expect(facets.sourceTotal).toBe(10);
    expect(facets.unassignedSource).toBe(3);
    expect(facets.bySource).toEqual([{ sourceId: "src-a", count: 7 }]);
    expect(facets.ownerTotal).toBe(10);
    expect(facets.unassignedOwner).toBe(2);
    expect(facets.assignedToMe).toBe(5);
    expect(facets.statusTotal).toBe(10);
    expect(facets.byStatus).toEqual({ OPEN: 8, WON: 2 });
    expect(facets.scoreTotal).toBe(10);
    expect(facets.byScore["niet-beoordeeld"]).toBe(10);
    expect(facets.byScore.hoog).toBe(0);
    expect(facets.byIndustry).toEqual(
      expect.arrayContaining([
        { value: "geen-bedrijf", count: 2 },
        { value: "industrie_productie", count: 8 },
        { value: "onbekend", count: 0 },
      ]),
    );
    expect(facets.byApplication).toEqual(
      expect.arrayContaining([
        { value: "kraan", count: 4 },
        { value: "onbekend", count: 3 },
      ]),
    );
    expect(facets.classificationStale).toBe(false);
  });

  it("negeert de eigen dimensie: score-facet houdt fase, niet de leadscore", async () => {
    await getDealFilterFacets({
      stageId: "stage-offerte",
      leadscore: "hoog",
      zoeken: "demo",
    });

    const scoreGroupCall = mockDealGroupBy.mock.calls.find(
      (call) => call[0]?.by?.[0] === "leadScore",
    );
    expect(scoreGroupCall).toBeTruthy();
    const scoreWhere = JSON.stringify(scoreGroupCall?.[0]?.where);
    expect(scoreWhere).toContain("stage-offerte");
    expect(scoreWhere).toContain("demo");
    expect(scoreWhere).not.toContain("75");

    const stageGroupCall = mockDealGroupBy.mock.calls.find(
      (call) => call[0]?.by?.[0] === "stageId",
    );
    const stageWhere = JSON.stringify(stageGroupCall?.[0]?.where);
    expect(stageWhere).toContain("75");
  });

  it("zet classificationStale bij een fout in de classificatie-query", async () => {
    mockDealApplicationGroupBy.mockRejectedValue(new Error("db down"));
    const facets = await getDealFilterFacets({}, "user-me");
    expect(facets.classificationStale).toBe(true);
    expect(facets.byIndustry).toEqual([]);
  });
});
