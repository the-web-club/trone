import { describe, expect, it } from "vitest";
import {
  CLASSIFICATION_FILTER_NO_COMPANY,
  CLASSIFICATION_FILTER_UNKNOWN,
} from "@/lib/classification";
import {
  aggregateLinkedCompanyFacets,
  distinctCodesByEntity,
} from "@/lib/filters/aggregate";
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

describe("Other Filters Changed / self-exclusion aggregatie", () => {
  it("telt unieke leads via companyId-groepen, niet company-rijen", () => {
    const result = aggregateLinkedCompanyFacets(
      [
        { companyId: null, count: 14 },
        { companyId: "a", count: 418 },
        { companyId: "b", count: 2 },
        { companyId: "c", count: 18 },
      ],
      [
        { id: "a", industryCode: "transport_logistiek", sectorCode: "wegtransport" },
        { id: "b", industryCode: "transport_logistiek", sectorCode: null },
        { id: "c", industryCode: null, sectorCode: null },
      ],
      { includeNoCompany: true },
    );

    expect(result.industry.get("geen-bedrijf")).toBe(14);
    expect(result.industry.get("transport_logistiek")).toBe(420);
    expect(result.industry.get("onbekend")).toBe(18);
    expect(result.sector.get("wegtransport")).toBe(418);
    expect(result.sector.get("onbekend")).toBe(2);
    expect(result.total).toBe(452);
  });

  it("gebruikt COUNT DISTINCT bij dubbele toepassing-rijen", () => {
    const result = distinctCodesByEntity([
      { entityId: "lead-1", codes: ["kraan", "kraan", "vrachtwagen"] },
      { entityId: "lead-1", codes: ["kraan"] },
      { entityId: "lead-2", codes: [] },
      { entityId: "lead-3", codes: ["kraan"] },
    ]);
    expect(result.byCode.get("kraan")).toBe(2);
    expect(result.byCode.get("vrachtwagen")).toBe(1);
    expect(result.unknown).toBe(1);
    expect(result.total).toBe(3);
  });
});

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
