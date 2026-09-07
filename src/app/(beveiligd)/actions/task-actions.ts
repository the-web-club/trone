"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-session";
import { toActionError } from "@/lib/errors";
import { completeTask, createTask } from "@/lib/task-service";
import { parseTaskForm, parseTaskId } from "@/lib/task-validation";

function revalidateTaskPaths() {
  revalidatePath("/taken");
  revalidatePath("/kansen");
  revalidatePath("/leads", "layout");
  revalidatePath("/contacten", "layout");
  revalidatePath("/bedrijven", "layout");
}

export async function createTaskAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; createdAt?: number }> {
  try {
    const session = await requireSession();
    const input = parseTaskForm(formData);
    await createTask(input, session.user.id);
    revalidateTaskPaths();
    return { createdAt: Date.now() };
  } catch (error) {
    return toActionError(error);
  }
}

export async function completeTaskAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    const id = parseTaskId(formData);
    await completeTask(id, session.user.id);
    revalidateTaskPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
