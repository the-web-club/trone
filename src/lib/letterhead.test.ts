import { describe, expect, it } from "vitest";
import {
  EMPTY_LETTERHEAD,
  letterheadAddressLines,
  letterheadLegalParts,
  parseLetterheadJson,
} from "@/lib/letterhead";
import { parseLetterheadForm } from "@/lib/letterhead-validation";

describe("parseLetterheadJson", () => {
  it("levert lege velden bij ontbrekende of ongeldige json", () => {
    expect(parseLetterheadJson(undefined)).toEqual(EMPTY_LETTERHEAD);
    expect(parseLetterheadJson("{")).toEqual(EMPTY_LETTERHEAD);
  });

  it("leest alleen bekende velden", () => {
    expect(
      parseLetterheadJson(
        JSON.stringify({ name: "  Acme  ", iban: "NL00", extra: "x" }),
      ),
    ).toEqual({
      ...EMPTY_LETTERHEAD,
      name: "Acme",
      iban: "NL00",
    });
  });
});

describe("letterhead display", () => {
  it("slaat lege regels over", () => {
    expect(
      letterheadAddressLines({
        ...EMPTY_LETTERHEAD,
        addressLine: "Kade 1",
        city: "Utrecht",
      }),
    ).toEqual(["Kade 1", "Utrecht"]);
    expect(
      letterheadLegalParts({
        ...EMPTY_LETTERHEAD,
        cocNumber: "1",
        vatNumber: "",
        iban: "NL00",
      }),
    ).toEqual(["KvK 1", "IBAN NL00"]);
  });
});

describe("parseLetterheadForm", () => {
  it("accepteert lege velden", () => {
    const data = new FormData();
    expect(parseLetterheadForm(data)).toEqual(EMPTY_LETTERHEAD);
  });

  it("weigert een ongeldig e-mailadres", () => {
    const data = new FormData();
    data.set("email", "niet-geldig");
    expect(() => parseLetterheadForm(data)).toThrow("Ongeldig e-mailadres");
  });
});
