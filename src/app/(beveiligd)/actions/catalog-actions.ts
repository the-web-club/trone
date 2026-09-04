"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-session";
import { isImageFile } from "@/lib/blob";
import { parseMoney, parseSwatchHex } from "@/lib/catalog-validation";
import {
  addProductImage,
  deleteProductImage,
  setDefaultImage,
  updateOptionValuePrice,
  updateOptionValueSwatch,
  updateProductBasePrice,
} from "@/lib/catalog-service";
import { toActionError } from "@/lib/errors";
import type { ImageSelection } from "@/lib/product-visuals";

function revalidateCatalogPaths() {
  revalidatePath("/producten");
  revalidatePath("/offertes/nieuw");
}

export async function updateProductBasePriceAction(
  productId: string,
  basePrice: number,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    await updateProductBasePrice(productId, parseMoney(basePrice, "Basisprijs"));
    revalidateCatalogPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateOptionValuePriceAction(
  optionValueId: string,
  priceDelta: number,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    await updateOptionValuePrice(
      optionValueId,
      parseMoney(priceDelta, "Meerprijs"),
    );
    revalidateCatalogPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateOptionValueSwatchAction(
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const optionValueId = String(formData.get("optionValueId") ?? "");
    const file = formData.get("file");
    const hexRaw = formData.get("swatchHex");
    const hasHex = typeof hexRaw === "string" && hexRaw.trim() !== "";
    await updateOptionValueSwatch(optionValueId, {
      swatchHex: hasHex ? parseSwatchHex(hexRaw) : undefined,
      file: isImageFile(file) ? file : undefined,
    });
    revalidateCatalogPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function addProductImageAction(
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const productId = String(formData.get("productId") ?? "");
    const file = formData.get("file");
    if (!isImageFile(file)) {
      return { error: "Kies een afbeelding." };
    }
    const selections: ImageSelection[] = [];
    for (const pair of formData.getAll("selection")) {
      const [optionId, optionValueId] = String(pair).split(":");
      if (optionId && optionValueId) {
        selections.push({ optionId, optionValueId });
      }
    }
    await addProductImage(
      productId,
      file,
      selections,
      formData.get("isDefault") === "on",
    );
    revalidateCatalogPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteProductImageAction(
  imageId: string,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    await deleteProductImage(imageId);
    revalidateCatalogPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function setDefaultImageAction(
  imageId: string,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    await setDefaultImage(imageId);
    revalidateCatalogPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
