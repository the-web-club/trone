import { describe, expect, it, vi } from "vitest";
import { resolveVatTreatment } from "@/lib/vat";
import {
  checkViesVatNumber,
  interpretViesResponse,
  parseVatNumber,
} from "@/lib/vies-service";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("parseVatNumber", () => {
  it("splitst landcode en nummer", () => {
    expect(parseVatNumber("NL123456789B01")).toEqual({
      countryCode: "NL",
      vatNumber: "123456789B01",
    });
    expect(parseVatNumber("de 123.456.789")).toEqual({
      countryCode: "DE",
      vatNumber: "123456789",
    });
    expect(parseVatNumber("123456789B01", "NL")).toEqual({
      countryCode: "NL",
      vatNumber: "123456789B01",
    });
    expect(parseVatNumber("EL123456789")).toEqual({
      countryCode: "EL",
      vatNumber: "123456789",
    });
    expect(parseVatNumber("123456789", "GR")).toEqual({
      countryCode: "EL",
      vatNumber: "123456789",
    });
  });

  it("geeft null zonder nummer", () => {
    expect(parseVatNumber("")).toBeNull();
    expect(parseVatNumber("   ")).toBeNull();
    expect(parseVatNumber(null)).toBeNull();
  });
});

describe("interpretViesResponse", () => {
  it("leest geldig en ongeldig", () => {
    expect(
      interpretViesResponse({
        ok: true,
        status: 200,
        body: { valid: true, name: "ACME GMBH" },
        countryCode: "DE",
        vatNumber: "123",
      }).status,
    ).toBe("GELDIG");
    expect(
      interpretViesResponse({
        ok: true,
        status: 200,
        body: { isValid: false, userError: "VALID" },
        countryCode: "DE",
        vatNumber: "123",
      }).status,
    ).toBe("ONGELDIG");
  });

  it("zet servicefouten op ONBEKEND, niet ongeldig", () => {
    for (const error of ["MS_UNAVAILABLE", "TIMEOUT", "SERVICE_UNAVAILABLE"]) {
      expect(
        interpretViesResponse({
          ok: true,
          status: 200,
          body: { isValid: false, userError: error },
          countryCode: "DE",
          vatNumber: "123",
        }).status,
        error,
      ).toBe("ONBEKEND");
    }
    expect(
      interpretViesResponse({
        ok: false,
        status: 503,
        body: { errorWrappers: [{ error: "MS_UNAVAILABLE" }] },
        countryCode: "DE",
        vatNumber: "123",
      }).status,
    ).toBe("ONBEKEND");
  });
});

describe("checkViesVatNumber", () => {
  it("belt VIES niet voor niet-EU-nummers", async () => {
    const fetchMock = vi.fn();
    const result = await checkViesVatNumber("GB123456789", { fetch: fetchMock });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.status).toBe("ONBEKEND");
    expect(result.error).toMatch(/alleen voor EU/i);
  });

  it("geeft ONBEKEND als VIES onbereikbaar is", async () => {
    const result = await checkViesVatNumber("DE123456789", {
      fetch: async () => {
        throw new Error("ECONNREFUSED");
      },
    });
    expect(result.status).toBe("ONBEKEND");
    expect(result.error).toMatch(/onbereikbaar/i);
  });

  it("geeft ONBEKEND bij timeout", async () => {
    const result = await checkViesVatNumber("DE123456789", {
      timeoutMs: 20,
      fetch: () => new Promise(() => {}),
    });
    expect(result.status).toBe("ONBEKEND");
    expect(result.error).toMatch(/timeout/i);
  });

  it("geeft ONBEKEND bij HTTP 500, daarna 21% in de beslisboom", async () => {
    const vies = await checkViesVatNumber("DE123456789", {
      fetch: async () => jsonResponse({ message: "down" }, 500),
    });
    expect(vies.status).toBe("ONBEKEND");
    const treatment = resolveVatTreatment("DE", vies.status);
    expect(treatment.vatRate).toBe(21);
    expect(treatment.vatRegime).toBe("BINNENLANDS");
    expect(treatment.warning).toBeTruthy();
  });

  it("geeft GELDIG plus de teruggegeven naam", async () => {
    const result = await checkViesVatNumber("DE123456789", {
      fetch: async () =>
        jsonResponse({ valid: true, name: "Beispiel GmbH" }),
    });
    expect(result.status).toBe("GELDIG");
    expect(result.name).toBe("Beispiel GmbH");
  });
});
