import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import type { PricingContext } from "@/lib/pricing";

// =====================================================================
// Laadt de volledige catalogus uit de DB en mapt die naar de PURE
// PricingContext (geen Prisma-types lekken naar de rekenmodule).
// De configurator haalt deze context één keer op (cachebaar) en rekent
// daarna client-side; de server rekent met exact dezelfde context na.
// =====================================================================

export async function loadPricingContext(
  prisma: PrismaClient
): Promise<PricingContext> {
  const [products, options, values, availability] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true } }),
    prisma.productOption.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.optionValue.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.productOptionAvailability.findMany(),
  ]);

  return {
    products: products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      basePrice: Number(p.basePrice),
    })),
    options: options.map((o) => ({
      id: o.id,
      code: o.code,
      name: o.name,
      inputType: o.inputType === "BOOLEAN" ? "boolean" : "select",
      isRequired: o.isRequired,
    })),
    values: values.map((v) => ({
      id: v.id,
      value: v.value,
      priceDelta: Number(v.priceDelta),
      priceOnRequest: v.priceOnRequest,
    })),
    availability: availability.map((a) => ({
      productId: a.productId,
      optionId: a.optionId,
      optionValueId: a.optionValueId,
    })),
  };
}
