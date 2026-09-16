import { describe, expect, it } from "vitest";
import { joinMeta, listSummary } from "@/lib/list-copy";

describe("joinMeta", () => {
  it("verbindt gevulde onderdelen met een punt", () => {
    expect(joinMeta(["Cofra", "Rick Aanraad"])).toBe("Cofra · Rick Aanraad");
  });

  it("slaat lege, ontbrekende en whitespace-waarden over", () => {
    expect(joinMeta(["Cofra", null, "", "  ", undefined, false, "Rick Aanraad"])).toBe(
      "Cofra · Rick Aanraad",
    );
  });

  it("behoudt 0 als geldige waarde", () => {
    expect(joinMeta(["Pipeline", 0])).toBe("Pipeline · 0");
    expect(joinMeta([0, "leads"])).toBe("0 · leads");
  });

  it("geeft een lege string zonder losse scheidingstekens", () => {
    expect(joinMeta([null, "", false])).toBe("");
    expect(joinMeta([])).toBe("");
  });
});

describe("listSummary", () => {
  it("kiest enkelvoud en meervoud", () => {
    expect(listSummary(1, "lead", "leads")).toBe("1 lead");
    expect(listSummary(0, "lead", "leads")).toBe("0 leads");
    expect(listSummary(2, "lead", "leads")).toBe("2 leads");
    expect(listSummary(1292, "lead", "leads")).toBe("1.292 leads");
  });
});
