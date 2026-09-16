import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import {
  CLASSIFICATION_FILTER_NO_COMPANY,
  CLASSIFICATION_FILTER_UNKNOWN,
  APPLICATIONS,
  INDUSTRIES,
  RELATION_TYPES,
  formatIndustrySector,
  getSectorsForIndustry,
  migrateApplicationLabel,
  migrateIndustryLabel,
  migrateSectorLabel,
  normalizeIndustrySector,
  parseApplicationCodes,
  parseClassificationParamValues,
  parseIndustryFilterValues,
  parseRelationTypeCodes,
  sectorBelongsToIndustry,
  uniqueApplicationCodes,
} from "@/lib/classification";

describe("taxonomie", () => {
  it("heeft stabiele codes en Nederlandse labels", () => {
    expect(INDUSTRIES.some((item) => item.code === "transport_logistiek")).toBe(
      true,
    );
    expect(INDUSTRIES.at(-1)?.code).toBe("overig");
    expect(APPLICATIONS.some((item) => item.code === "heftruck_intern_transport")).toBe(
      true,
    );
    expect(RELATION_TYPES.map((item) => item.code)).toContain("eindgebruiker");
  });

  it("geeft Overig als sector binnen iedere hoofdbranche", () => {
    for (const industry of INDUSTRIES) {
      expect(industry.sectors.some((sector) => sector.code === "overig")).toBe(
        true,
      );
    }
  });

  it("koppelt sectoren alleen aan de eigen hoofdbranche", () => {
    expect(sectorBelongsToIndustry("industrie_productie", "chemie")).toBe(true);
    expect(sectorBelongsToIndustry("industrie_productie", "akkerbouw")).toBe(
      false,
    );
    expect(getSectorsForIndustry("landbouw_tuinbouw_bosbouw").map((item) => item.code)).toContain(
      "akkerbouw",
    );
  });
});

describe("normalizeIndustrySector", () => {
  it("staat alleen een hoofdbranche toe", () => {
    expect(
      normalizeIndustrySector({
        industryCode: "transport_logistiek",
        sectorCode: null,
      }),
    ).toEqual({ industryCode: "transport_logistiek", sectorCode: null });
  });

  it("verwijdert een ongeldige sector bij branchewijziging in één actie", () => {
    expect(
      normalizeIndustrySector(
        {
          industryCode: "transport_logistiek",
          sectorCode: "akkerbouw",
        },
        {
          industryCode: "landbouw_tuinbouw_bosbouw",
          sectorCode: "akkerbouw",
        },
      ),
    ).toEqual({ industryCode: "transport_logistiek", sectorCode: null });
  });

  it("weigert een ongeldige combinatie zonder branchewijziging", () => {
    expect(() =>
      normalizeIndustrySector(
        {
          industryCode: "transport_logistiek",
          sectorCode: "akkerbouw",
        },
        {
          industryCode: "transport_logistiek",
          sectorCode: "wegtransport",
        },
      ),
    ).toThrow(AppError);
    expect(() =>
      normalizeIndustrySector({
        industryCode: "transport_logistiek",
        sectorCode: "akkerbouw",
      }),
    ).toThrow(/hoort niet bij/);
  });

  it("weigert een sector zonder hoofdbranche en onbekende codes", () => {
    expect(() =>
      normalizeIndustrySector({ industryCode: null, sectorCode: "wegtransport" }),
    ).toThrow(/hoofdbranche/);
    expect(() =>
      normalizeIndustrySector({
        industryCode: "niet-bestaand",
        sectorCode: null,
      }),
    ).toThrow(/Ongeldige hoofdbranche/);
  });

  it("behandelt leeg als onbekend, niet als fictieve branche", () => {
    expect(
      normalizeIndustrySector({ industryCode: "", sectorCode: "" }),
    ).toEqual({ industryCode: null, sectorCode: null });
  });
});

describe("codesets", () => {
  it("weigert onbekende relatietypen en toepassingen", () => {
    expect(parseRelationTypeCodes(["eindgebruiker", "verhuurder"])).toEqual([
      "eindgebruiker",
      "verhuurder",
    ]);
    expect(() => parseRelationTypeCodes(["klant"])).toThrow(/relatietype/);
    expect(parseApplicationCodes(["kraan", "kraan"])).toEqual(["kraan"]);
    expect(() => parseApplicationCodes(["onzin"])).toThrow(/toepassing/);
  });

  it("dedupliceert toepassingen uit gekoppelde aanvragen", () => {
    expect(
      uniqueApplicationCodes([
        { applications: [{ code: "kraan" }, { code: "vrachtwagen" }] },
        { applications: ["kraan", "kantoorwerkplek"] },
      ]),
    ).toEqual(["kraan", "vrachtwagen", "kantoorwerkplek"]);
  });
});

describe("filters en migratie", () => {
  it("parst meervoudige URL-waarden met OF-semantiek", () => {
    expect(
      parseClassificationParamValues(["transport_logistiek,overig", "industrie_productie"]),
    ).toEqual([
      "transport_logistiek",
      "overig",
      "industrie_productie",
    ]);
    expect(
      parseIndustryFilterValues([
        "transport_logistiek",
        CLASSIFICATION_FILTER_NO_COMPANY,
        CLASSIFICATION_FILTER_UNKNOWN,
        "foo",
      ]),
    ).toEqual([
      "transport_logistiek",
      CLASSIFICATION_FILTER_NO_COMPANY,
      CLASSIFICATION_FILTER_UNKNOWN,
    ]);
  });

  it("migreert alleen eenduidige labels", () => {
    expect(migrateIndustryLabel("Industrie & productie")).toBe(
      "industrie_productie",
    );
    expect(migrateIndustryLabel("Transportbedrijf")).toBeNull();
    expect(migrateSectorLabel("Chemie")).toEqual({
      industryCode: "industrie_productie",
      sectorCode: "chemie",
    });
    expect(migrateSectorLabel("Overig", "transport_logistiek")).toEqual({
      industryCode: "transport_logistiek",
      sectorCode: "overig",
    });
    expect(migrateApplicationLabel("Heftruck & intern transport")).toBe(
      "heftruck_intern_transport",
    );
    expect(migrateApplicationLabel("stoel")).toBeNull();
  });

  it("toont branche en sector compact", () => {
    expect(formatIndustrySector("industrie_productie", "chemie")).toBe(
      "Industrie & productie · Chemie",
    );
    expect(formatIndustrySector("overig", null)).toBe("Overig");
    expect(formatIndustrySector(null, null)).toBeNull();
  });
});
