import "server-only";

import { AppError } from "@/lib/errors";
import { getPrismaClient } from "@/lib/db";

export async function listProductsWithOptions() {
  const prisma = getPrismaClient();
  const [products, options] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.productOption.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        values: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
  ]);

  return {
    products: products.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      basePrice: Number(product.basePrice),
    })),
    options: options.map((option) => ({
      id: option.id,
      code: option.code,
      name: option.name,
      sortOrder: option.sortOrder,
      values: option.values.map((value) => ({
        id: value.id,
        value: value.value,
        priceDelta: Number(value.priceDelta),
        priceOnRequest: value.priceOnRequest,
      })),
    })),
  };
}

export async function updateProductBasePrice(productId: string, basePrice: number) {
  const prisma = getPrismaClient();
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new AppError("Product niet gevonden.", "NOT_FOUND", 404);
  }

  return prisma.product.update({
    where: { id: productId },
    data: { basePrice },
  });
}

export async function updateOptionValuePrice(
  optionValueId: string,
  priceDelta: number,
) {
  const prisma = getPrismaClient();
  const value = await prisma.optionValue.findUnique({
    where: { id: optionValueId },
  });
  if (!value) {
    throw new AppError("Optiewaarde niet gevonden.", "NOT_FOUND", 404);
  }
  if (value.priceOnRequest) {
    throw new AppError(
      "Deze optie heeft prijs op aanvraag en kan niet worden gewijzigd.",
      "VALIDATION",
    );
  }

  return prisma.optionValue.update({
    where: { id: optionValueId },
    data: { priceDelta },
  });
}
