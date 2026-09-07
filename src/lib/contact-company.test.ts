import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { assertDealContactCompany } from "@/lib/deal-validation";
import {
  assertContactBelongsToCompany,
  contactBelongsToCompany,
  getContactCompany,
  getContactCompanyId,
} from "@/lib/contact-company";

describe("getContactCompanyId", () => {
  it("leest het huidige 1:1-bedrijf van het contact", () => {
    expect(getContactCompanyId({ companyId: "bedrijf-a" })).toBe("bedrijf-a");
    expect(getContactCompanyId({ companyId: null })).toBeNull();
    expect(getContactCompanyId(null)).toBeNull();
  });

  it("geeft getContactCompany als { id } terug", () => {
    expect(getContactCompany({ companyId: "bedrijf-a" })).toEqual({
      id: "bedrijf-a",
    });
    expect(getContactCompany({ companyId: null })).toBeNull();
  });
});

describe("assertDealContactCompany", () => {
  it("eist dat het contact bij het bedrijf van de lead hoort", () => {
    expect(() =>
      assertDealContactCompany({ companyId: "bedrijf-a" }, "bedrijf-b"),
    ).toThrow(AppError);
    expect(() =>
      assertDealContactCompany({ companyId: "bedrijf-a" }, "bedrijf-b"),
    ).toThrow(/hoort niet bij het gekozen bedrijf/);
  });

  it("staat een contact toe bij hetzelfde bedrijf", () => {
    expect(() =>
      assertDealContactCompany({ companyId: "bedrijf-a" }, "bedrijf-a"),
    ).not.toThrow();
    expect(contactBelongsToCompany({ companyId: "bedrijf-a" }, "bedrijf-a")).toBe(
      true,
    );
  });

  it("weigert een contact zonder bedrijf als de lead wél een bedrijf heeft", () => {
    expect(() =>
      assertDealContactCompany({ companyId: null }, "bedrijf-a"),
    ).toThrow(AppError);
  });

  it("weigert een contact met bedrijf als de lead geen bedrijf heeft", () => {
    expect(() =>
      assertDealContactCompany({ companyId: "bedrijf-a" }, null),
    ).toThrow(AppError);
  });

  it("doet niets als de lead geen contact heeft", () => {
    expect(() => assertDealContactCompany(null, "bedrijf-a")).not.toThrow();
  });
});

describe("assertContactBelongsToCompany", () => {
  it("gebruikt dezelfde regel voor offertes en orders", () => {
    expect(() =>
      assertContactBelongsToCompany({ companyId: "bedrijf-a" }, "bedrijf-a"),
    ).not.toThrow();
    expect(() =>
      assertContactBelongsToCompany({ companyId: "bedrijf-a" }, "bedrijf-b"),
    ).toThrow(AppError);
  });
});
