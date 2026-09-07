import { describe, expect, it } from "vitest";
import { isEuCountry, isNetherlands } from "@/lib/eu-countries";
import {
  DEFAULT_VAT_RATE,
  VAT_WARNINGS,
  isViesCacheFresh,
  resolveVatTreatment,
  shouldRefreshVies,
  viesStatusFromCache,
  zeroRateWithoutValidVies,
} from "@/lib/vat";

describe("resolveVatTreatment", () => {
  it("zet NL-klanten op 21% binnenlands", () => {
    const treatment = resolveVatTreatment("NL", "GELDIG");
    expect(treatment).toMatchObject({
      vatRate: 21,
      vatRegime: "BINNENLANDS",
      warning: null,
    });
  });

  it("behandelt een leeg land als NL", () => {
    expect(resolveVatTreatment("", "ONBEKEND").vatRegime).toBe("BINNENLANDS");
    expect(resolveVatTreatment(null, "GELDIG").vatRate).toBe(21);
  });

  it("zet EU-klanten buiten NL met geldig VIES op 0% verlegd", () => {
    const treatment = resolveVatTreatment("DE", "GELDIG");
    expect(treatment).toMatchObject({
      vatRate: 0,
      vatRegime: "VERLEGD",
      warning: null,
      mention: "Btw verlegd / reverse charge",
    });
  });

  it("zet EU-klanten zonder geldig VIES op 21% met waarschuwing", () => {
    const treatment = resolveVatTreatment("BE", "ONGELDIG");
    expect(treatment.vatRate).toBe(DEFAULT_VAT_RATE);
    expect(treatment.vatRegime).toBe("BINNENLANDS");
    expect(treatment.warning).toBe(VAT_WARNINGS.EU_INVALID);
  });

  it("zet EU-klanten met onbekende VIES-status op 21% met waarschuwing", () => {
    const treatment = resolveVatTreatment("fr", "ONBEKEND");
    expect(treatment).toMatchObject({
      vatRate: 21,
      vatRegime: "BINNENLANDS",
      warning: VAT_WARNINGS.EU_UNKNOWN,
    });
  });

  it("zet klanten buiten de EU op 0% export, ongeacht VIES", () => {
    for (const country of ["GB", "UK", "CH", "NO", "US"]) {
      const treatment = resolveVatTreatment(country, "GELDIG");
      expect(treatment, country).toMatchObject({
        vatRate: 0,
        vatRegime: "EXPORT",
        warning: null,
        mention: "Export / 0% btw",
      });
    }
  });

  it("behandelt Griekenland (GR/EL) als EU, niet als export", () => {
    expect(resolveVatTreatment("GR", "GELDIG").vatRegime).toBe("VERLEGD");
    expect(resolveVatTreatment("EL", "ONGELDIG").vatRegime).toBe("BINNENLANDS");
    expect(resolveVatTreatment("GR", "ONBEKEND").vatRate).toBe(21);
  });

  it("kent 0% nooit stil toe bij twijfel binnen de EU", () => {
    expect(resolveVatTreatment("IT", "ONGELDIG").vatRate).toBe(21);
    expect(resolveVatTreatment("IT", "ONBEKEND").vatRate).toBe(21);
    expect(resolveVatTreatment("IT", "GELDIG").vatRate).toBe(0);
  });
});

describe("EU-landcodes", () => {
  it("herkent EU en niet-EU", () => {
    expect(isEuCountry("NL")).toBe(true);
    expect(isEuCountry("de")).toBe(true);
    expect(isNetherlands("nl")).toBe(true);
    expect(isEuCountry("GB")).toBe(false);
    expect(isEuCountry("CH")).toBe(false);
    expect(isEuCountry("NO")).toBe(false);
    expect(isEuCountry("XI")).toBe(true);
  });
});

describe("VIES-cache", () => {
  it("is vers binnen 90 dagen en verlopen daarna", () => {
    const now = new Date("2026-09-07T12:00:00.000Z");
    expect(isViesCacheFresh(new Date("2026-06-10T12:00:00.000Z"), now)).toBe(
      true,
    );
    expect(isViesCacheFresh(new Date("2026-06-08T11:00:00.000Z"), now)).toBe(
      false,
    );
    expect(isViesCacheFresh(null, now)).toBe(false);
  });

  it("ververst alleen bij EU-buitenland met nummer en stale/ontbrekende cache", () => {
    expect(
      shouldRefreshVies({
        country: "DE",
        vatNumber: "DE123",
        viesValidatedAt: null,
      }),
    ).toBe(true);
    expect(
      shouldRefreshVies({
        country: "NL",
        vatNumber: "NL123",
        viesValidatedAt: null,
      }),
    ).toBe(false);
    expect(
      shouldRefreshVies({
        country: "GB",
        vatNumber: "GB123",
        viesValidatedAt: null,
      }),
    ).toBe(false);
  });

  it("leest GELDIG/ONGELDIG uit een verse cache en ONBEKEND als die stale is", () => {
    const fresh = new Date().toISOString();
    expect(
      viesStatusFromCache({
        country: "DE",
        vatNumber: "DE123",
        viesValid: true,
        viesValidatedAt: fresh,
      }),
    ).toEqual({ status: "GELDIG", stale: false });
    expect(
      viesStatusFromCache({
        country: "DE",
        vatNumber: "DE123",
        viesValid: false,
        viesValidatedAt: fresh,
      }),
    ).toEqual({ status: "ONGELDIG", stale: false });
    expect(
      viesStatusFromCache({
        country: "DE",
        vatNumber: "DE123",
        viesValid: true,
        viesValidatedAt: null,
      }),
    ).toEqual({ status: "ONBEKEND", stale: true });
  });
});

describe("zeroRateWithoutValidVies", () => {
  it("waarschuwt alleen bij 0% zonder verlegd of export", () => {
    expect(
      zeroRateWithoutValidVies({ vatRate: 0, vatRegime: "BINNENLANDS" }),
    ).toBe(true);
    expect(zeroRateWithoutValidVies({ vatRate: 0, vatRegime: null })).toBe(
      true,
    );
    expect(
      zeroRateWithoutValidVies({ vatRate: 0, vatRegime: "VERLEGD" }),
    ).toBe(false);
    expect(zeroRateWithoutValidVies({ vatRate: 0, vatRegime: "EXPORT" })).toBe(
      false,
    );
    expect(
      zeroRateWithoutValidVies({ vatRate: 21, vatRegime: "BINNENLANDS" }),
    ).toBe(false);
  });
});
