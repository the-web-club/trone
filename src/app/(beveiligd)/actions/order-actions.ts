"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-session";
import { toActionError } from "@/lib/errors";
import { parseSubmissionId } from "@/lib/form-submission";
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
  _prev: { error?: string; order?: { orderNumber: string } } | null,
  formData: FormData,
): Promise<{
  error?: string;
  fieldErrors?: Record<string, string>;
  order?: { orderNumber: string };
}> {
  try {
    const session = await requireSession();
    const submissionId = parseSubmissionId(formData.get("submissionId"));
    const input = parseCreateOrderFromQuoteForm(formData);
    const order = await createOrderFromQuote(input, session.user.id, {
      submissionId,
    });
    revalidateOrderPaths(order);
    return { order: { orderNumber: order.orderNumber } };
  } catch (error) {
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
