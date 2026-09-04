import type { PriceResult, PricingContext } from "@/lib/pricing";

export type QuoteConfigSnapshot = {
  productId: string;
  productSku: string;
  productName: string;
  selections: {
    optionId: string;
    optionCode: string;
    optionName: string;
    optionValueId: string;
    value: string;
    priceDelta: number;
    priceOnRequest: boolean;
  }[];
  price: PriceResult;
  computedAt: string;
};

export function isQuoteConfigSnapshot(
  value: unknown,
): value is QuoteConfigSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as QuoteConfigSnapshot;
  return (
    typeof snapshot.productName === "string" &&
    Array.isArray(snapshot.selections) &&
    snapshot.price != null &&
    typeof snapshot.price.unitNet === "number"
  );
}

export type CatalogValue = {
  id: string;
  optionId: string;
  value: string;
  priceDelta: number;
  priceOnRequest: boolean;
};

export type CatalogOption = {
  id: string;
  code: string;
  name: string;
  inputType: "select" | "boolean";
  isRequired: boolean;
  values: CatalogValue[];
};

export type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
  basePrice: number;
};

export type CatalogAvailability = {
  productId: string;
  optionId: string;
  optionValueId: string | null;
};

export type QuoteCatalog = {
  products: CatalogProduct[];
  options: CatalogOption[];
  availability: CatalogAvailability[];
};

export function toPricingContext(catalog: QuoteCatalog): PricingContext {
  return {
    products: catalog.products.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      basePrice: product.basePrice,
    })),
    options: catalog.options.map((option) => ({
      id: option.id,
      code: option.code,
      name: option.name,
      inputType: option.inputType,
      isRequired: option.isRequired,
    })),
    values: catalog.options.flatMap((option) =>
      option.values.map((value) => ({
        id: value.id,
        value: value.value,
        priceDelta: value.priceDelta,
        priceOnRequest: value.priceOnRequest,
      })),
    ),
    availability: catalog.availability,
  };
}

export function isOptionAvailableForProduct(
  catalog: QuoteCatalog,
  productId: string,
  optionId: string,
): boolean {
  const restrictedElsewhere = catalog.availability.some(
    (row) => row.optionId === optionId && row.productId !== productId,
  );
  const allowedHere = catalog.availability.some(
    (row) => row.optionId === optionId && row.productId === productId,
  );
  return !(restrictedElsewhere && !allowedHere);
}

export function valuesForProductOption(
  catalog: QuoteCatalog,
  productId: string,
  option: CatalogOption,
): CatalogValue[] {
  const valueRules = catalog.availability.filter(
    (row) =>
      row.productId === productId &&
      row.optionId === option.id &&
      row.optionValueId,
  );
  if (valueRules.length === 0) return option.values;
  const allowed = new Set(valueRules.map((row) => row.optionValueId));
  return option.values.filter((value) => allowed.has(value.id));
}

export function optionsForProduct(catalog: QuoteCatalog, productId: string) {
  return catalog.options.filter((option) =>
    isOptionAvailableForProduct(catalog, productId, option.id),
  );
}

export function defaultSelections(
  catalog: QuoteCatalog,
  productId: string,
): { optionId: string; optionValueId: string }[] {
  return optionsForProduct(catalog, productId)
    .filter((option) => option.isRequired)
    .flatMap((option) => {
      const values = valuesForProductOption(catalog, productId, option);
      const first = values[0];
      return first
        ? [{ optionId: option.id, optionValueId: first.id }]
        : [];
    });
}

export function resolveDiscountPercent(
  discounts: { productId: string | null; discountPercent: number }[],
  productId: string,
): number {
  const specific = discounts.find((row) => row.productId === productId);
  const general = discounts.find((row) => row.productId == null);
  return specific?.discountPercent ?? general?.discountPercent ?? 0;
}
