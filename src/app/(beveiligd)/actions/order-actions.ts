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

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

function revalidateOrderPaths(order?: {
  id?: string;
  quoteId?: string | null;
  dealId?: string | null;
}) {
  revalidatePath("/orders");
  revalidatePath("/offertes");
  revalidatePath("/overzicht");
  revalidatePath("/leads");
  if (order?.id) revalidatePath(`/orders/${order.id}`);
  if (order?.quoteId) revalidatePath(`/offertes/${order.quoteId}`);
  if (order?.dealId) revalidatePath(`/leads/${order.dealId}`);
}

export async function createOrderFromQuoteAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    const input = parseCreateOrderFromQuoteForm(formData);
    const order = await createOrderFromQuote(input, session.user.id);
    revalidateOrderPaths({
      id: order.id,
      quoteId: order.quoteId,
      dealId: order.dealId,
    });
    redirect(`/orders/${order.id}`);
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
    await requireSession();
    const id = parseOrderId(formData);
    const status = parseOrderStatusForm(formData);
    const order = await updateOrderStatus(id, status);
    revalidateOrderPaths({
      id: order.id,
      quoteId: order.quoteId,
      dealId: order.dealId,
    });
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
