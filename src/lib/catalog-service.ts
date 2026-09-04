import "server-only";

import { AppError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import { uploadImage } from "@/lib/blob";
import type { ImageSelection, ProductImageMatch } from "@/lib/product-visuals";

function mapImage(image: {
  id: string;
  productId: string;
  imageUrl: string;
  isDefault: boolean;
  selections: { optionId: string; optionValueId: string }[];
}): ProductImageMatch {
  return {
    id: image.id,
    productId: image.productId,
    imageUrl: image.imageUrl,
    isDefault: image.isDefault,
    selections: image.selections.map((row) => ({
      optionId: row.optionId,
      optionValueId: row.optionValueId,
    })),
  };
}

export async function listProductsWithOptions() {
  const prisma = getPrismaClient();
  const [products, options, images] = await Promise.all([
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
    prisma.productImage.findMany({
      include: { selections: true },
      orderBy: [{ isDefault: "desc" }, { id: "asc" }],
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
        optionId: value.optionId,
        value: value.value,
        priceDelta: Number(value.priceDelta),
        priceOnRequest: value.priceOnRequest,
        swatchHex: value.swatchHex,
        swatchImageUrl: value.swatchImageUrl,
      })),
    })),
    images: images.map(mapImage),
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

export async function updateOptionValueSwatch(
  optionValueId: string,
  input: { swatchHex?: string | null; file?: File },
) {
  const prisma = getPrismaClient();
  const value = await prisma.optionValue.findUnique({
    where: { id: optionValueId },
  });
  if (!value) {
    throw new AppError("Optiewaarde niet gevonden.", "NOT_FOUND", 404);
  }

  const data: { swatchHex?: string | null; swatchImageUrl?: string } = {};
  if (input.swatchHex !== undefined) {
    data.swatchHex = input.swatchHex;
  }
  if (input.file) {
    data.swatchImageUrl = await uploadImage(input.file, `swatches/${optionValueId}`);
  }

  return prisma.optionValue.update({
    where: { id: optionValueId },
    data,
  });
}

export async function listProductImages(productId?: string) {
  const prisma = getPrismaClient();
  const images = await prisma.productImage.findMany({
    where: productId ? { productId } : undefined,
    include: { selections: true },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  });
  return images.map(mapImage);
}

export async function addProductImage(
  productId: string,
  file: File,
  selections: ImageSelection[],
  makeDefault = false,
) {
  const prisma = getPrismaClient();
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new AppError("Product niet gevonden.", "NOT_FOUND", 404);
  }

  for (const selection of selections) {
    const option = await prisma.productOption.findUnique({
      where: { id: selection.optionId },
    });
    if (!option) {
      throw new AppError("Optie niet gevonden.", "NOT_FOUND", 404);
    }
    const value = await prisma.optionValue.findUnique({
      where: { id: selection.optionValueId },
    });
    if (!value || value.optionId !== selection.optionId) {
      throw new AppError("Optiewaarde niet gevonden.", "NOT_FOUND", 404);
    }
  }

  const imageUrl = await uploadImage(file, `products/${product.sku}`);
  const existingDefault = await prisma.productImage.findFirst({
    where: { productId, isDefault: true },
  });
  const isDefault = makeDefault || !existingDefault;
  const id = createId();

  if (isDefault) {
    await prisma.productImage.updateMany({
      where: { productId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.productImage.create({
    data: {
      id,
      productId,
      imageUrl,
      isDefault,
      selections: {
        create: selections.map((selection) => ({
          id: createId(),
          optionId: selection.optionId,
          optionValueId: selection.optionValueId,
        })),
      },
    },
    include: { selections: true },
  });
}

export async function deleteProductImage(imageId: string) {
  const prisma = getPrismaClient();
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) {
    throw new AppError("Afbeelding niet gevonden.", "NOT_FOUND", 404);
  }
  return prisma.productImage.delete({ where: { id: imageId } });
}

export async function setDefaultImage(imageId: string) {
  const prisma = getPrismaClient();
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) {
    throw new AppError("Afbeelding niet gevonden.", "NOT_FOUND", 404);
  }

  await prisma.productImage.updateMany({
    where: { productId: image.productId, isDefault: true },
    data: { isDefault: false },
  });
  return prisma.productImage.update({
    where: { id: imageId },
    data: { isDefault: true },
  });
}
