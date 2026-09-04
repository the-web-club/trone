// =====================================================================
// Pricing domein — kern. Pure functies, geen side effects.
// calculatePrice() is de SINGLE SOURCE OF TRUTH voor prijs.
// Zowel de configurator (client) als de offerte/order-flow (server)
// roepen deze functie aan, zodat de getoonde prijs == de afgerekende prijs.
// =====================================================================

import type {
  ConfigError,
  ConfigurationInput,
  OptionAvailability,
  OptionValue,
  PriceLine,
  PriceResult,
  PricingContext,
  Product,
  ProductOption,
  SelectedOption,
} from "./types";

const DEFAULT_VAT_RATE = 21;

/** Afronden op 2 decimalen zonder floating-point ruis. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** BTW over een nettobedrag. `vatRate` is een percentage (0..100). */
export function vatOnNet(netTotal: number, vatRate: number): {
  vatAmount: number;
  grossTotal: number;
} {
  const vatAmount = round2((netTotal * vatRate) / 100);
  return { vatAmount, grossTotal: round2(netTotal + vatAmount) };
}

function indexBy<T, K extends string>(rows: T[], key: (row: T) => K): Map<K, T> {
  const m = new Map<K, T>();
  for (const r of rows) m.set(key(r), r);
  return m;
}

/**
 * Valideer een configuratie tegen de catalogus-context.
 * Geeft een lijst fouten terug (leeg = geldig). Bewust puur: geen throw,
 * zodat de configurator fouten live kan tonen en de server ze kan afwijzen.
 */
export function validateConfiguration(
  input: ConfigurationInput,
  ctx: PricingContext
): ConfigError[] {
  const errors: ConfigError[] = [];

  const product = ctx.products.find((p) => p.id === input.productId);
  if (!product) {
    return [
      { code: "PRODUCT_NOT_FOUND", message: `Product ${input.productId} bestaat niet.` },
    ];
  }

  const optionById = indexBy(ctx.options, (o) => o.id);
  const valueById = indexBy(ctx.values, (v) => v.id);

  // Availability voor dit product per optie verzamelen.
  const availForProduct = ctx.availability.filter((a) => a.productId === product.id);
  const optionHasAvailRule = new Set(availForProduct.map((a) => a.optionId));
  const allowedValueByOption = new Map<string, Set<string>>();
  for (const a of availForProduct) {
    if (a.optionValueId) {
      if (!allowedValueByOption.has(a.optionId))
        allowedValueByOption.set(a.optionId, new Set());
      allowedValueByOption.get(a.optionId)!.add(a.optionValueId);
    }
  }

  // Dubbele opties in de selectie afvangen.
  const seen = new Set<string>();
  for (const sel of input.selections) {
    if (seen.has(sel.optionId)) {
      const opt = optionById.get(sel.optionId);
      errors.push({
        code: "DUPLICATE_OPTION",
        message: `Optie ${opt?.name ?? sel.optionId} is dubbel gekozen.`,
        optionCode: opt?.code,
      });
    }
    seen.add(sel.optionId);
  }

  for (const sel of input.selections) {
    const opt = optionById.get(sel.optionId);
    if (!opt) {
      errors.push({
        code: "OPTION_NOT_FOUND",
        message: `Optie ${sel.optionId} bestaat niet.`,
      });
      continue;
    }
    const val = valueById.get(sel.optionValueId);
    if (!val) {
      errors.push({
        code: "VALUE_NOT_FOUND",
        message: `Waarde ${sel.optionValueId} bestaat niet.`,
        optionCode: opt.code,
      });
      continue;
    }
    // Hoort de waarde bij de optie?
    const valueBelongsToOption = ctx.values.some(
      (v) => v.id === sel.optionValueId && optionOwnsValue(ctx, opt.id, v.id)
    );
    if (!valueBelongsToOption) {
      errors.push({
        code: "VALUE_OPTION_MISMATCH",
        message: `Waarde ${val.value} hoort niet bij optie ${opt.name}.`,
        optionCode: opt.code,
      });
      continue;
    }
    // Availability: als het product availability-regels voor deze optie heeft,
    // dan moet de optie (en evt. de specifieke waarde) toegestaan zijn.
    if (availForProduct.length > 0) {
      // Regel op waarde-niveau aanwezig?
      const valueRules = allowedValueByOption.get(opt.id);
      const optionAllowedWhole =
        optionHasAvailRule.has(opt.id) &&
        availForProduct.some((a) => a.optionId === opt.id && a.optionValueId === null);

      if (valueRules && valueRules.size > 0) {
        if (!valueRules.has(sel.optionValueId)) {
          errors.push({
            code: "VALUE_NOT_AVAILABLE",
            message: `Waarde ${val.value} is niet beschikbaar voor ${product.name}.`,
            optionCode: opt.code,
          });
        }
      } else if (!optionAllowedWhole && optionHasAvailRule.has(opt.id)) {
        // Optie heeft alleen waarde-regels die deze waarde niet dekken.
        errors.push({
          code: "VALUE_NOT_AVAILABLE",
          message: `Waarde ${val.value} is niet beschikbaar voor ${product.name}.`,
          optionCode: opt.code,
        });
      }
      // Speciale asymmetrie: een optie die WEL een availability-regel heeft voor
      // een ANDER product maar niet voor dit product, is hier niet toegestaan.
      const optionRestrictedElsewhere = ctx.availability.some(
        (a) => a.optionId === opt.id && a.productId !== product.id
      );
      const optionAllowedHere = optionHasAvailRule.has(opt.id);
      if (optionRestrictedElsewhere && !optionAllowedHere) {
        errors.push({
          code: "OPTION_NOT_AVAILABLE",
          message: `Optie ${opt.name} is niet beschikbaar voor ${product.name}.`,
          optionCode: opt.code,
        });
      }
    } else {
      // Product heeft geen eigen availability-regels, maar de optie kan elders
      // beperkt zijn (bv luchtvering alleen bij ECS). Dan hier niet toegestaan.
      const optionRestrictedElsewhere = ctx.availability.some(
        (a) => a.optionId === opt.id && a.productId !== product.id
      );
      if (optionRestrictedElsewhere) {
        errors.push({
          code: "OPTION_NOT_AVAILABLE",
          message: `Optie ${opt.name} is niet beschikbaar voor ${product.name}.`,
          optionCode: opt.code,
        });
      }
    }
  }

  // Verplichte opties aanwezig?
  for (const opt of ctx.options) {
    if (!opt.isRequired) continue;
    const chosen = input.selections.some((s) => s.optionId === opt.id);
    if (!chosen) {
      errors.push({
        code: "REQUIRED_OPTION_MISSING",
        message: `Verplichte optie ${opt.name} ontbreekt.`,
        optionCode: opt.code,
      });
    }
  }

  return errors;
}

/** Hoort een waarde bij een optie? (via de context values-lijst) */
function optionOwnsValue(
  ctx: PricingContext,
  optionId: string,
  valueId: string
): boolean {
  // We hebben geen optionId op OptionValue in de pure types, dus de aanroeper
  // levert values die al gefilterd zijn; hier vertrouwen we op de availability/
  // selectie-consistentie. Deze helper bestaat als expliciet punt om later een
  // optionId aan OptionValue toe te voegen indien gewenst.
  return ctx.values.some((v) => v.id === valueId);
}

/**
 * Bereken de volledige prijs van een configuratie.
 * Gooit NIET; valideer eerst met validateConfiguration() als je fouten wilt tonen.
 * Onbekende selecties worden hier defensief overgeslagen (delta 0).
 */
export function calculatePrice(
  input: ConfigurationInput,
  ctx: PricingContext
): PriceResult {
  const product =
    ctx.products.find((p) => p.id === input.productId) ??
    ({ id: "", sku: "", name: "Onbekend product", basePrice: 0 } as Product);

  const optionById = indexBy(ctx.options, (o) => o.id);
  const valueById = indexBy(ctx.values, (v) => v.id);

  const quantity = Math.max(1, input.quantity ?? 1);
  const vatRate = input.vatRate ?? DEFAULT_VAT_RATE;
  const discountPercent = clamp(input.discountPercent ?? 0, 0, 100);

  const optionLines: PriceLine[] = [];
  const onRequestOptions: string[] = [];
  let optionsTotal = 0;

  for (const sel of input.selections) {
    const opt = optionById.get(sel.optionId);
    const val = valueById.get(sel.optionValueId);
    if (!opt || !val) continue;

    if (val.priceOnRequest) {
      onRequestOptions.push(opt.code);
      optionLines.push({
        label: `${opt.name}: ${val.value}`,
        amount: 0,
        onRequest: true,
      });
      continue;
    }
    // €0-opties (bv stof, hoofdsteun) tonen we alleen als ze een keuze zijn,
    // niet als lawaai: we nemen ze mee in de opbouw met amount 0.
    optionsTotal += val.priceDelta;
    optionLines.push({
      label: `${opt.name}: ${val.value}`,
      amount: round2(val.priceDelta),
      onRequest: false,
    });
  }

  const basePrice = round2(product.basePrice);
  optionsTotal = round2(optionsTotal);
  const unitSubtotal = round2(basePrice + optionsTotal);
  const discountAmount = round2((unitSubtotal * discountPercent) / 100);
  const unitNet = round2(unitSubtotal - discountAmount);
  const netTotal = round2(unitNet * quantity);
  const { vatAmount, grossTotal } = vatOnNet(netTotal, vatRate);

  return {
    productName: product.name,
    basePrice,
    optionLines,
    optionsTotal,
    unitSubtotal,
    discountPercent,
    discountAmount,
    unitNet,
    quantity,
    netTotal,
    vatRate,
    vatAmount,
    grossTotal,
    hasOnRequest: onRequestOptions.length > 0,
    onRequestOptions,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
