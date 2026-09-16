import { describe, expect, it } from "vitest";
import { formatCount, formatEuro, formatEuroExact, formatPersonName } from "@/lib/format";

describe("formatCount", () => {
  it("gebruikt Nederlandse duizendtallen", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(18)).toBe("18");
    expect(formatCount(1292)).toBe("1.292");
  });
});

describe("formatEuro", () => {
  it("geeft null bij ontbrekende waarden", () => {
    expect(formatEuro(null)).toBeNull();
    expect(formatEuro(undefined)).toBeNull();
    expect(formatEuro(Number.NaN)).toBeNull();
  });

  it("behoudt 0 als geldig bedrag", () => {
    expect(formatEuro(0)).toMatch(/€\s*0/);
  });
});

describe("formatEuroExact", () => {
  it("toont 0,00 in plaats van een leeg veld", () => {
    expect(formatEuroExact(0)).toMatch(/€\s*0,00/);
  });
});

describe("formatPersonName", () => {
  it("laat een ontbrekende achternaam weg zonder scheidingsteken", () => {
    expect(formatPersonName("Rick", null)).toBe("Rick");
    expect(formatPersonName("Rick", "Aanraad")).toBe("Rick Aanraad");
  });
});
