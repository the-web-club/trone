import { describe, expect, it } from "vitest";
import { effectiveDealValue, sumActiveQuoteTotals } from "@/lib/deal-value";

describe("sumActiveQuoteTotals", () => {
  it("telt concept-, verzonden- en geaccepteerde offertes bij elkaar", () => {
    expect(
      sumActiveQuoteTotals([
        { status: "DRAFT", total: 21550 },
        { status: "SENT", total: 12816 },
        { status: "ACCEPTED", total: 9070 },
      ]),
    ).toBe(43436);
  });

  it("negeert afgewezen en verlopen offertes", () => {
    expect(
      sumActiveQuoteTotals([
        { status: "DRAFT", total: 1000 },
        { status: "REJECTED", total: 5000 },
        { status: "EXPIRED", total: 2000 },
      ]),
    ).toBe(1000);
  });

  it("geeft null zonder actieve offertes", () => {
    expect(sumActiveQuoteTotals([])).toBeNull();
    expect(
      sumActiveQuoteTotals([{ status: "REJECTED", total: 5000 }]),
    ).toBeNull();
  });
});

describe("effectiveDealValue", () => {
  it("kiest de offertesom boven de handmatige schatting", () => {
    expect(
      effectiveDealValue(12000, [{ status: "DRAFT", total: 43436 }]),
    ).toBe(43436);
  });

  it("valt terug op de handmatige schatting zonder actieve offertes", () => {
    expect(effectiveDealValue(12000, [])).toBe(12000);
    expect(
      effectiveDealValue(12000, [{ status: "REJECTED", total: 43436 }]),
    ).toBe(12000);
  });
});
