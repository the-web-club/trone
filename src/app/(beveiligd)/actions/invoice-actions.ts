"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth-session";
import { AppError, toActionError } from "@/lib/errors";
import { createInvoiceFromOrder } from "@/lib/invoice-service";
import { orderPath } from "@/lib/paths";

function parseOrderId(formData: FormData): string {
  const parsed = z
    .string()
    .trim()
    .min(1, "Order ontbreekt")
    .safeParse(formData.get("orderId"));
  if (!parsed.success) {
    throw new AppError("Order ontbreekt.", "VALIDATION");
  }
  return parsed.data;
}

export async function createInvoiceFromOrderAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireSession();
    const orderId = parseOrderId(formData);
    const invoice = await createInvoiceFromOrder(orderId);
    revalidatePath("/orders", "layout");
    revalidatePath("/overzicht");
    revalidatePath(orderPath(invoice.order));
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
