import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCompanyGroupBy, mockCompanyCount, mockDealGroupBy } = vi.hoisted(
  () => ({
    mockCompanyGroupBy: vi.fn(),
    mockCompanyCount: vi.fn(),
    mockDealGroupBy: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  getPrismaClient: () => ({
    company: {
      groupBy: mockCompanyGroupBy,
      count: mockCompanyCount,
    },
    deal: {
      groupBy: mockDealGroupBy,
    },
  }),
}));

import {
  getCompanyLeadFacets,
  getCompanyOwnerFacets,
  resolveCompanyListWhere,
} from "@/lib/company-service";

describe("getCompanyOwnerFacets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompanyGroupBy.mockResolvedValue([]);
    mockDealGroupBy.mockResolvedValue([]);
  });

  it("negeert de eigen dimensie: eigenaar-facet houdt plaats/land, niet de eigenaar", async () => {
    await getCompanyOwnerFacets(
      {
        query: "acme",
        city: "Breda",
        country: "NL",
        eigenaar: "aan-mij",
      },
      "user-me",
    );

    const ownerGroupCall = mockCompanyGroupBy.mock.calls[0];
    expect(ownerGroupCall).toBeTruthy();
    const where = JSON.stringify(ownerGroupCall?.[0]?.where);
    expect(where).toContain("acme");
    expect(where).toContain("Breda");
    expect(where).toContain("NL");
    expect(where).not.toContain("aan-mij");
    expect(where).not.toContain("user-me");
  });

  it("houdt de leads-filter aan bij eigenaar-facet", async () => {
    await getCompanyOwnerFacets(
      { city: "Breda", eigenaar: "aan-mij", leads: "geen" },
      "user-me",
    );

    expect(mockDealGroupBy).not.toHaveBeenCalled();
    const where = JSON.stringify(mockCompanyGroupBy.mock.calls[0]?.[0]?.where);
    expect(where).toContain("Breda");
    expect(where).toContain("none");
    expect(where).not.toContain("aan-mij");
  });

  it("leidt totalen af uit groupBy op ownerUserId", async () => {
    mockCompanyGroupBy.mockResolvedValue([
      { ownerUserId: null, _count: { _all: 2 } },
      { ownerUserId: "user-me", _count: { _all: 5 } },
      { ownerUserId: "user-other", _count: { _all: 3 } },
    ]);

    const facets = await getCompanyOwnerFacets({}, "user-me");

    expect(mockCompanyGroupBy).toHaveBeenCalledTimes(1);
    expect(facets.ownerTotal).toBe(10);
    expect(facets.unassignedOwner).toBe(2);
    expect(facets.assignedToMe).toBe(5);
    expect(facets.byOwner).toEqual([
      { userId: "user-me", count: 5 },
      { userId: "user-other", count: 3 },
    ]);
  });
});

describe("getCompanyLeadFacets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompanyCount.mockResolvedValue(0);
    mockDealGroupBy.mockResolvedValue([]);
  });

  it("negeert de eigen dimensie: leads-facet houdt plaats, niet het aantal leads", async () => {
    await getCompanyLeadFacets({
      city: "Amsterdam",
      leads: "5plus",
    });

    const where = JSON.stringify(mockDealGroupBy.mock.calls[0]?.[0]?.where);
    expect(where).toContain("Amsterdam");
    expect(where).not.toContain("5plus");
    expect(JSON.stringify(mockCompanyCount.mock.calls[0]?.[0]?.where)).toContain(
      "Amsterdam",
    );
  });

  it("verdeelt bedrijven over lead-buckets", async () => {
    mockCompanyCount
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(4);
    mockDealGroupBy.mockResolvedValue([
      { companyId: "a", _count: { _all: 1 } },
      { companyId: "b", _count: { _all: 1 } },
      { companyId: "c", _count: { _all: 2 } },
      { companyId: "d", _count: { _all: 4 } },
      { companyId: "e", _count: { _all: 7 } },
      { companyId: null, _count: { _all: 3 } },
    ]);

    const facets = await getCompanyLeadFacets({});

    expect(facets.total).toBe(12);
    expect(facets.none).toBe(4);
    expect(facets.byCount).toEqual({
      "1": 2,
      "2": 1,
      "3": 0,
      "4": 1,
      "5plus": 1,
    });
  });
});

describe("resolveCompanyListWhere", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDealGroupBy.mockResolvedValue([]);
  });

  it("filtert bedrijven zonder leads via deals.none", async () => {
    const where = await resolveCompanyListWhere({
      city: "Breda",
      leads: "geen",
    });

    expect(mockDealGroupBy).not.toHaveBeenCalled();
    expect(JSON.stringify(where)).toContain("Breda");
    expect(JSON.stringify(where)).toContain("none");
  });

  it("filtert op exact aantal leads via deal-groupBy", async () => {
    mockDealGroupBy.mockResolvedValue([
      { companyId: "one", _count: { _all: 1 } },
      { companyId: "two", _count: { _all: 2 } },
      { companyId: "five", _count: { _all: 5 } },
    ]);

    const where = await resolveCompanyListWhere({ leads: "2" });

    expect(JSON.stringify(where)).toContain("two");
    expect(JSON.stringify(where)).not.toContain("one");
    expect(JSON.stringify(where)).not.toContain("five");
  });

  it("filtert 5 of meer leads", async () => {
    mockDealGroupBy.mockResolvedValue([
      { companyId: "four", _count: { _all: 4 } },
      { companyId: "five", _count: { _all: 5 } },
      { companyId: "nine", _count: { _all: 9 } },
    ]);

    const where = await resolveCompanyListWhere({ leads: "5plus" });
    const serialized = JSON.stringify(where);

    expect(serialized).toContain("five");
    expect(serialized).toContain("nine");
    expect(serialized).not.toContain("four");
  });
});
