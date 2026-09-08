import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCompanyGroupBy } = vi.hoisted(() => ({
  mockCompanyGroupBy: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  getPrismaClient: () => ({
    company: {
      groupBy: mockCompanyGroupBy,
    },
  }),
}));

import { getCompanyOwnerFacets } from "@/lib/company-service";

describe("getCompanyOwnerFacets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompanyGroupBy.mockResolvedValue([]);
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
