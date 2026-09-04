import { describe, expect, it } from "vitest";
import {
  timelineWhereForCompany,
  timelineWhereForContact,
  timelineWhereForDeal,
} from "@/lib/timeline-where";

describe("timelineWhereForDeal", () => {
  it("includes the deal and optional contact and company", () => {
    expect(
      timelineWhereForDeal({
        dealId: "deal-1",
        contactId: "contact-1",
        companyId: "company-1",
      }),
    ).toEqual({
      OR: [
        { dealId: "deal-1" },
        { contactId: "contact-1" },
        { companyId: "company-1" },
      ],
    });
  });

  it("omits empty optional links", () => {
    expect(timelineWhereForDeal({ dealId: "deal-1" })).toEqual({
      OR: [{ dealId: "deal-1" }],
    });
  });
});

describe("timelineWhereForContact", () => {
  it("includes related deals and the company", () => {
    expect(
      timelineWhereForContact({
        contactId: "contact-1",
        dealIds: ["deal-1", "deal-2"],
        companyId: "company-1",
      }),
    ).toEqual({
      OR: [
        { contactId: "contact-1" },
        { dealId: { in: ["deal-1", "deal-2"] } },
        { companyId: "company-1" },
      ],
    });
  });

  it("skips empty deal lists", () => {
    expect(
      timelineWhereForContact({ contactId: "contact-1", dealIds: [] }),
    ).toEqual({
      OR: [{ contactId: "contact-1" }],
    });
  });
});

describe("timelineWhereForCompany", () => {
  it("includes contacts and deals of the company", () => {
    expect(
      timelineWhereForCompany({
        companyId: "company-1",
        contactIds: ["c1"],
        dealIds: ["d1"],
      }),
    ).toEqual({
      OR: [
        { companyId: "company-1" },
        { contactId: { in: ["c1"] } },
        { dealId: { in: ["d1"] } },
      ],
    });
  });
});
