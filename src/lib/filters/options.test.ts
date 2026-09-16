import { describe, expect, it } from "vitest";
import {
  CLASSIFICATION_FILTER_NO_COMPANY,
  CLASSIFICATION_FILTER_UNKNOWN,
} from "@/lib/classification";
import {
  applicationFacetCatalog,
  industryFacetCatalog,
  isRegisteredFacetKey,
  registeredFacetKeys,
} from "@/lib/filters/definitions";
import { mergeFacetOptions } from "@/lib/filters/options";
import { facetSelectOptions } from "@/components/filters/facet-select";

describe("mergeFacetOptions", () => {
  const catalog = [
    { value: "transport_logistiek", label: "Transport & logistiek" },
    { value: "industrie_productie", label: "Industrie & productie" },
    { value: "onbekend", label: "Hoofdbranche onbekend" },
  ];

  it("toont initiële tellingen, inclusief 0, zonder te verbergen", () => {
    const options = mergeFacetOptions({
      catalog,
      counts: new Map([
        ["transport_logistiek", 418],
        ["onbekend", 18],
      ]),
    });
    expect(options.map((option) => [option.value, option.count, option.disabled])).toEqual([
      ["transport_logistiek", 418, false],
      ["industrie_productie", 0, true],
      ["onbekend", 18, false],
    ]);
  });

  it("laat een geselecteerde optie met 0 verwijderbaar", () => {
    const options = mergeFacetOptions({
      catalog,
      counts: new Map([["transport_logistiek", 12]]),
      selected: ["industrie_productie"],
    });
    const selected = options.find((option) => option.value === "industrie_productie");
    expect(selected).toMatchObject({ count: 0, disabled: false });
    const empty = options.find((option) => option.value === "onbekend");
    expect(empty).toMatchObject({ count: 0, disabled: true });
  });

  it("behandelt ontbrekende tellingen niet als 0", () => {
    const options = mergeFacetOptions({
      catalog,
      counts: null,
    });
    expect(options.every((option) => option.count === null && !option.disabled)).toBe(
      true,
    );
  });
});

describe("facetSelectOptions", () => {
  it("formatteert Nederlandse tellingen en houdt Alle interactief", () => {
    const options = facetSelectOptions({
      catalog: [{ value: "open", label: "Open" }],
      counts: [{ value: "open", count: 1292 }],
      all: { value: "__alle__", label: "Alle", count: 1292 },
    });
    expect(options[0]).toMatchObject({
      value: "__alle__",
      disabled: false,
      hint: "1.292",
    });
    expect(options[1]?.hint).toBe("1.292");
  });
});

// De aggregatie zelf is naar SQL verhuisd. Zie
// `filters/facet-exclusion.test.ts` voor self-exclusion en
// `filters/facet-counts.db.test.ts` voor COUNT(DISTINCT), geen-bedrijf en
// onbekend tegen een echte dataset.

describe("filterdefinities", () => {
  it("registreert alleen bekende facetkeys", () => {
    expect(isRegisteredFacetKey("lead", "branche")).toBe(true);
    expect(isRegisteredFacetKey("lead", "drop-table")).toBe(false);
    expect(registeredFacetKeys("lead")).toEqual(
      expect.arrayContaining(["fase", "bron", "branche", "sector", "toepassing"]),
    );
  });

  it("houdt onbekend en geen-bedrijf als stabiele keys", () => {
    const industries = industryFacetCatalog({ includeNoCompany: true });
    expect(industries[0]?.value).toBe(CLASSIFICATION_FILTER_NO_COMPANY);
    expect(industries.some((item) => item.value === CLASSIFICATION_FILTER_UNKNOWN)).toBe(
      true,
    );
    expect(
      applicationFacetCatalog().some(
        (item) => item.value === CLASSIFICATION_FILTER_UNKNOWN,
      ),
    ).toBe(true);
  });
});

describe("filterflow (e2e-semantiek)", () => {
  it("opent een facet, toont 0 disabled, past een ander filter toe en laat deselectie toe", () => {
    const catalog = industryFacetCatalog();
    const initial = mergeFacetOptions({
      catalog,
      counts: new Map([
        ["transport_logistiek", 418],
        ["industrie_productie", 201],
        ["bouw_infra_grondverzet", 0],
      ]),
    });
    const zero = initial.find((item) => item.value === "bouw_infra_grondverzet");
    expect(zero).toMatchObject({ count: 0, disabled: true });

    const afterStatus = mergeFacetOptions({
      catalog,
      counts: new Map([
        ["transport_logistiek", 40],
        ["industrie_productie", 0],
      ]),
      selected: ["industrie_productie"],
    });
    expect(
      afterStatus.find((item) => item.value === "transport_logistiek")?.count,
    ).toBe(40);
    expect(
      afterStatus.find((item) => item.value === "industrie_productie"),
    ).toMatchObject({ count: 0, disabled: false });
  });
});
