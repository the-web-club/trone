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

function revalidateWorkLogPaths() {
  revalidatePath("/logboek");
  revalidatePath("/overzicht");
  revalidatePath("/bedrijven", "layout");
  revalidatePath("/orders", "layout");
}

export async function createWorkLogAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; loggedAt?: number }> {
  try {
    const session = await requireSession();
    const input = parseWorkLogForm(formData);
    await createWorkLog(input, session.user.id);
    revalidateWorkLogPaths();
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
    await updateWorkLog(id, input, {
      userId: session.user.id,
      isAdmin: isAdminSession(session),
    });
    revalidateWorkLogPaths();
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
    revalidateWorkLogPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
