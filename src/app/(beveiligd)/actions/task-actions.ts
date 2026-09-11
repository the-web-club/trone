"use server";

import { revalidatePath } from "next/cache";
import { requireWritableSession } from "@/lib/auth-session";
import { toActionError } from "@/lib/errors";
import { completeTask, reopenTask } from "@/lib/task-service";
import { parseTaskId } from "@/lib/task-validation";

function revalidateTaskPaths() {
  revalidatePath("/taken");
  revalidatePath("/leads", "layout");
  revalidatePath("/contacten", "layout");
  revalidatePath("/bedrijven", "layout");
}

export async function completeTaskAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireWritableSession();
    const id = parseTaskId(formData);
    await completeTask(id, session.user.id);
    revalidateTaskPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function reopenTaskAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireWritableSession();
    const id = parseTaskId(formData);
    await reopenTask(id);
    revalidateTaskPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
