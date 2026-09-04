"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-session";
import { parseMoney } from "@/lib/catalog-validation";
import {
  updateOptionValuePrice,
  updateProductBasePrice,
} from "@/lib/catalog-service";
import { toActionError } from "@/lib/errors";

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
