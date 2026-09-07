"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { toActionError } from "@/lib/errors";
import {
  createOrderFromQuote,
  updateOrderStatus,
} from "@/lib/order-service";
import {
  parseCreateOrderFromQuoteForm,
  parseOrderId,
  parseOrderStatusForm,
} from "@/lib/order-validation";
import { orderPath } from "@/lib/paths";

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

function revalidateOrderPaths(order?: { orderNumber: string }) {
  revalidatePath("/orders", "layout");
  revalidatePath("/offertes", "layout");
  revalidatePath("/overzicht");
  revalidatePath("/leads", "layout");
  revalidatePath("/bedrijven", "layout");
  revalidatePath("/contacten", "layout");
  if (order) revalidatePath(orderPath(order));
}

export async function createOrderFromQuoteAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    const input = parseCreateOrderFromQuoteForm(formData);
    const order = await createOrderFromQuote(input, session.user.id);
    revalidateOrderPaths(order);
    redirect(orderPath(order));
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return toActionError(error);
  }
}

export async function updateOrderStatusAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    const id = parseOrderId(formData);
    const status = parseOrderStatusForm(formData);
    const order = await updateOrderStatus(id, status, session.user.id);
    revalidateOrderPaths(order);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
