import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import {
  companyRecordToInput,
  mergeCompanyPatch,
  parseCompanyForm,
  parseComposerCompanyForm,
} from "@/lib/company-validation";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("parseCompanyForm", () => {
  it("accepteert buitenlandse adressen en landcodes", () => {
    const input = parseCompanyForm(
      form({
        name: "Multi-Link Terminals Ltd Oy",
        email: "risto.koso@mlt.fi",
        phone: "358504393633",
        addressLine: "Siikasaarentie 131",
        postalCode: "48310",
        city: "Kotka",
        country: "FI",
        vatRate: "21",
      }),
    );
    expect(input.country).toBe("FI");
    expect(input.postalCode).toBe("48310");
    expect(input.city).toBe("Kotka");
  });

  it("normaliseert UK naar GB", () => {
    const input = parseCompanyForm(
      form({
        name: "Acme Ltd",
        country: "uk",
      }),
    );
    expect(input.country).toBe("GB");
  });

  it("weiger een ongeldige landcode", () => {
    expect(() =>
      parseCompanyForm(form({ name: "Acme", country: "Finland" })),
    ).toThrow(AppError);
  });
});

const current = companyRecordToInput({
  name: "Acme BV",
  email: "info@acme.test",
  vatNumber: "NL123456789B01",
  cocNumber: "12345678",
  website: "https://acme.test",
  phone: "0612345678",
  addressLine: "Keizersgracht 1",
  postalCode: "1015 CJ",
  city: "Amsterdam",
  country: "NL",
  vatRate: 21,
  notes: "Bestaande notitie",
});

describe("mergeCompanyPatch", () => {
  it("wijzigt alleen het opgegeven veld", () => {
    expect(mergeCompanyPatch(current, { city: "Rotterdam" })).toEqual({
      ...current,
      city: "Rotterdam",
    });
  });

  it("kan optionele velden leegmaken", () => {
    expect(mergeCompanyPatch(current, { email: null, notes: null })).toEqual({
      ...current,
      email: undefined,
      notes: undefined,
    });
  });

  it("weigert een lege naam", () => {
    expect(() => mergeCompanyPatch(current, { name: "   " })).toThrow(AppError);
  });

  it("weigert een ongeldig e-mailadres", () => {
    expect(() =>
      mergeCompanyPatch(current, { email: "niet-geldig" }),
    ).toThrow(AppError);
  });
});

describe("parseComposerCompanyForm", () => {
  it("leest het gekozen land", () => {
    const input = parseComposerCompanyForm(
      form({
        companyName: "Multi-Link Terminals Ltd Oy",
        companyCountry: "FI",
      }),
    );
    expect(input.country).toBe("FI");
  });
});
