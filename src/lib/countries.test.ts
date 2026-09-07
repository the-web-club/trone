import { describe, expect, it } from "vitest";
import {
  countryLabel,
  countrySelectOptions,
  isIsoCountryCode,
  normalizeCountryCode,
} from "@/lib/countries";

describe("countries", () => {
  it("vertaalt ISO-codes naar Nederlandse namen", () => {
    expect(countryLabel("FI")).toBe("Finland");
    expect(countryLabel("fi")).toBe("Finland");
    expect(countryLabel("NL")).toBe("Nederland");
    expect(countryLabel("GB")).toMatch(/koninkrijk/i);
    expect(countryLabel("CH")).toBe("Zwitserland");
    expect(countryLabel("NO")).toBe("Noorwegen");
  });

  it("normaliseert UK naar GB", () => {
    expect(normalizeCountryCode("UK")).toBe("GB");
    expect(countryLabel("UK")).toBe(countryLabel("GB"));
  });

  it("biedt Finland en andere niet-NL landen in de keuzelijst", () => {
    const values = countrySelectOptions().map((row) => row.value);
    expect(values).toEqual(expect.arrayContaining(["FI", "NL", "GB", "CH", "NO", "US"]));
    expect(
      countrySelectOptions().find((row) => row.value === "FI")?.label,
    ).toBe("Finland");
  });

  it("herkent ISO-landcodes", () => {
    expect(isIsoCountryCode("FI")).toBe(true);
    expect(isIsoCountryCode("uk")).toBe(true);
    expect(isIsoCountryCode("Finland")).toBe(false);
    expect(isIsoCountryCode("")).toBe(false);
  });
});
