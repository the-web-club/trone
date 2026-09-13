import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockContactGroupBy } = vi.hoisted(() => ({
  mockContactGroupBy: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  getPrismaClient: () => ({
    contact: {
      groupBy: mockContactGroupBy,
    },
  }),
}));

import { getContactOwnerFacets } from "@/lib/contact-service";

describe("getContactOwnerFacets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContactGroupBy.mockResolvedValue([]);
  });

  it("negeert de eigen dimensie: eigenaar-facet houdt zoek/bedrijf, niet de eigenaar", async () => {
    await getContactOwnerFacets(
      {
        query: "jan",
        companyId: "co-1",
        eigenaar: "aan-mij",
      },
      "user-me",
    );

    const ownerGroupCall = mockContactGroupBy.mock.calls[0];
    expect(ownerGroupCall).toBeTruthy();
    const where = JSON.stringify(ownerGroupCall?.[0]?.where);
    expect(where).toContain("jan");
    expect(where).toContain("co-1");
    expect(where).not.toContain("aan-mij");
    expect(where).not.toContain("user-me");
  });

  it("leidt totalen af uit groupBy op ownerUserId", async () => {
    mockContactGroupBy.mockResolvedValue([
      { ownerUserId: null, _count: { _all: 2 } },
      { ownerUserId: "user-me", _count: { _all: 5 } },
      { ownerUserId: "user-other", _count: { _all: 3 } },
    ]);

    const facets = await getContactOwnerFacets({}, "user-me");

    expect(mockContactGroupBy).toHaveBeenCalledTimes(1);
    expect(facets.ownerTotal).toBe(10);
    expect(facets.unassignedOwner).toBe(2);
    expect(facets.assignedToMe).toBe(5);
    expect(facets.byOwner).toEqual([
      { userId: "user-me", count: 5 },
      { userId: "user-other", count: 3 },
    ]);
  });
});
