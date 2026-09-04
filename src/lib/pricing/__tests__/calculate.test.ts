import { describe, expect, it } from "vitest";
import { calculatePrice, validateConfiguration, vatOnNet } from "../calculate";
import type { PricingContext } from "../types";

// Minimale, realistische context o.b.v. het echte TRÔNE-schema.
const ctx: PricingContext = {
  products: [
    { id: "p_ecs", sku: "ECS", name: "ECS (statisch)", basePrice: 2555 },
    { id: "p_las", sku: "LAS4.1", name: "LAS4.1 (luchtgeveerd)", basePrice: 2875 },
  ],
  options: [
    { id: "o_fabric", code: "fabric", name: "Stoftype / kleur", inputType: "select", isRequired: true },
    { id: "o_control", code: "control", name: "Bediening", inputType: "select", isRequired: true },
    { id: "o_back", code: "back_height", name: "Rughoogte", inputType: "select", isRequired: true },
    { id: "o_arm", code: "armrest", name: "Armleuningen", inputType: "select", isRequired: false },
    { id: "o_belt", code: "belt", name: "Veiligheidsgordel", inputType: "select", isRequired: false },
    { id: "o_climate", code: "climate", name: "Climate", inputType: "select", isRequired: false },
    { id: "o_air", code: "air_suspension", name: "Luchtvering", inputType: "select", isRequired: false },
    { id: "o_seatlift", code: "seatlift", name: "Seatlift", inputType: "boolean", isRequired: false },
    { id: "o_turntable", code: "turntable", name: "Draaitafel", inputType: "boolean", isRequired: false },
  ],
  values: [
    { id: "v_leder", value: "100% leder", priceDelta: 0, priceOnRequest: false },
    { id: "v_front", value: "Front-control", priceDelta: 0, priceOnRequest: false },
    { id: "v_high", value: "Highback", priceDelta: 0, priceOnRequest: false },
    { id: "v_arm10", value: "10-direction", priceDelta: 540, priceOnRequest: false },
    { id: "v_belt3", value: "3-punts easy-grip", priceDelta: 350, priceOnRequest: false },
    { id: "v_climate_both", value: "Verwarming + koeling", priceDelta: 550, priceOnRequest: false },
    { id: "v_ts95", value: "TS95", priceDelta: 950, priceOnRequest: false },
    { id: "v_seatlift_ja", value: "Ja", priceDelta: 800, priceOnRequest: false },
    { id: "v_turntable_ja", value: "Ja", priceDelta: 0, priceOnRequest: true },
  ],
  // Luchtvering alleen bij ECS (LAS4.1 heeft geïntegreerde vering).
  availability: [{ productId: "p_ecs", optionId: "o_air", optionValueId: null }],
};

const required = [
  { optionId: "o_fabric", optionValueId: "v_leder" },
  { optionId: "o_control", optionValueId: "v_front" },
  { optionId: "o_back", optionValueId: "v_high" },
];

describe("calculatePrice", () => {
  it("rekent basis + opties correct (LAS4.1 voorbeeld)", () => {
    const r = calculatePrice(
      {
        productId: "p_las",
        selections: [
          ...required,
          { optionId: "o_arm", optionValueId: "v_arm10" },
          { optionId: "o_belt", optionValueId: "v_belt3" },
          { optionId: "o_seatlift", optionValueId: "v_seatlift_ja" },
          { optionId: "o_climate", optionValueId: "v_climate_both" },
        ],
      },
      ctx
    );
    // 2875 + 540 + 350 + 800 + 550 = 5115
    expect(r.unitSubtotal).toBe(5115);
    expect(r.netTotal).toBe(5115);
    expect(r.vatRate).toBe(21);
    expect(r.vatAmount).toBe(1074.15);
    expect(r.grossTotal).toBe(6189.15);
  });

  it("rekent ECS met luchtvering correct", () => {
    const r = calculatePrice(
      {
        productId: "p_ecs",
        selections: [...required, { optionId: "o_air", optionValueId: "v_ts95" }],
      },
      ctx
    );
    // 2555 + 950 = 3505
    expect(r.unitSubtotal).toBe(3505);
  });

  it("past klantkorting toe vóór btw", () => {
    const r = calculatePrice(
      { productId: "p_las", selections: required, discountPercent: 10 },
      ctx
    );
    // 2875 -10% = 2587.5 ; btw 21% = 543.375 -> 543.38
    expect(r.discountAmount).toBe(287.5);
    expect(r.unitNet).toBe(2587.5);
    expect(r.grossTotal).toBe(3130.88);
  });

  it("vermenigvuldigt met aantal", () => {
    const r = calculatePrice(
      { productId: "p_las", selections: required, quantity: 3 },
      ctx
    );
    expect(r.netTotal).toBe(8625); // 2875 * 3
  });

  it("markeert prijs-op-aanvraag (draaitafel) zonder bedrag", () => {
    const r = calculatePrice(
      {
        productId: "p_las",
        selections: [...required, { optionId: "o_turntable", optionValueId: "v_turntable_ja" }],
      },
      ctx
    );
    expect(r.hasOnRequest).toBe(true);
    expect(r.onRequestOptions).toContain("turntable");
    expect(r.unitSubtotal).toBe(2875); // draaitafel telt niet mee in prijs
  });

  it("verlegde btw (0%) geeft geen btw-bedrag", () => {
    const r = calculatePrice(
      { productId: "p_las", selections: required, vatRate: 0 },
      ctx
    );
    expect(r.vatAmount).toBe(0);
    expect(r.grossTotal).toBe(2875);
  });
});

describe("vatOnNet", () => {
  it("neemt vatRate als percentage, niet als vermenigvuldiger", () => {
    expect(vatOnNet(5115, 21)).toEqual({
      vatAmount: 1074.15,
      grossTotal: 6189.15,
    });
  });

  it("rondt halve centen commercieel af", () => {
    // 2587.5 * 21% = 543.375 → 543.38
    expect(vatOnNet(2587.5, 21).vatAmount).toBe(543.38);
  });
});

describe("validateConfiguration", () => {
  it("accepteert een geldige configuratie", () => {
    const errs = validateConfiguration({ productId: "p_las", selections: required }, ctx);
    expect(errs).toHaveLength(0);
  });

  it("weigert luchtvering bij LAS4.1 (alleen ECS)", () => {
    const errs = validateConfiguration(
      {
        productId: "p_las",
        selections: [...required, { optionId: "o_air", optionValueId: "v_ts95" }],
      },
      ctx
    );
    expect(errs.some((e) => e.code === "OPTION_NOT_AVAILABLE")).toBe(true);
  });

  it("staat luchtvering toe bij ECS", () => {
    const errs = validateConfiguration(
      {
        productId: "p_ecs",
        selections: [...required, { optionId: "o_air", optionValueId: "v_ts95" }],
      },
      ctx
    );
    expect(errs).toHaveLength(0);
  });

  it("klaagt over ontbrekende verplichte optie", () => {
    const errs = validateConfiguration(
      { productId: "p_las", selections: [{ optionId: "o_fabric", optionValueId: "v_leder" }] },
      ctx
    );
    expect(errs.some((e) => e.code === "REQUIRED_OPTION_MISSING")).toBe(true);
  });

  it("weigert onbestaand product", () => {
    const errs = validateConfiguration({ productId: "x", selections: [] }, ctx);
    expect(errs[0].code).toBe("PRODUCT_NOT_FOUND");
  });
});
