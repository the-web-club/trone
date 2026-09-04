"use server";

import { revalidatePath } from "next/cache";
import { isAdminSession, requireSession } from "@/lib/auth-session";
import { toActionError } from "@/lib/errors";
import {
  createWorkLog,
  deleteWorkLog,
  updateWorkLog,
} from "@/lib/worklog-service";
import { parseWorkLogForm, parseWorkLogId } from "@/lib/worklog-validation";

function revalidateWorkLogPaths(input?: {
  companyId?: string | null;
  orderId?: string | null;
}) {
  revalidatePath("/logboek");
  revalidatePath("/overzicht");
  if (input?.companyId) revalidatePath(`/bedrijven/${input.companyId}`);
  if (input?.orderId) revalidatePath(`/orders/${input.orderId}`);
}

export async function createWorkLogAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; loggedAt?: number }> {
  try {
    const session = await requireSession();
    const input = parseWorkLogForm(formData);
    const log = await createWorkLog(input, session.user.id);
    revalidateWorkLogPaths({
      companyId: log.companyId,
      orderId: log.orderId,
    });
    return { loggedAt: Date.now() };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateWorkLogAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    const id = parseWorkLogId(formData);
    const input = parseWorkLogForm(formData);
    const log = await updateWorkLog(id, input, {
      userId: session.user.id,
      isAdmin: isAdminSession(session),
    });
    revalidateWorkLogPaths({
      companyId: log.companyId,
      orderId: log.orderId,
    });
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteWorkLogAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    const id = parseWorkLogId(formData);
    await deleteWorkLog(id, {
      userId: session.user.id,
      isAdmin: isAdminSession(session),
    });
    revalidateWorkLogPaths({
      companyId: String(formData.get("companyId") ?? "") || null,
      orderId: String(formData.get("orderId") ?? "") || null,
    });
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
