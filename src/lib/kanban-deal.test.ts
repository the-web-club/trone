import { describe, expect, it } from "vitest";
import { toKanbanDeal } from "@/lib/kanban-deal";

describe("toKanbanDeal", () => {
  it("koppelt eigenaar en offertestatus", () => {
    const deal = toKanbanDeal(
      {
        id: "deal-1",
        slug: "acme",
        title: "Acme stoelen",
        stageId: "stage-lead",
        company: { slug: "acme-bv", name: "Acme BV" },
        quotes: [{ status: "SENT", total: 1200 }],
        valueEstimate: 900,
        isHot: true,
        ownerUserId: "user-1",
        qualFit: null,
        qualNeed: null,
        qualIntent: null,
        qualDecision: null,
        qualTiming: null,
      },
      new Map([["user-1", "Anna"]]),
      new Map([["user-1", "/anna.png"]]),
    );

    expect(deal.ownerName).toBe("Anna");
    expect(deal.ownerImage).toBe("/anna.png");
    expect(deal.quoteStatus).toBe("SENT");
    expect(deal.company?.name).toBe("Acme BV");
  });
});
