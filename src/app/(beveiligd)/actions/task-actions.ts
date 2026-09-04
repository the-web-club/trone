"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-session";
import { toActionError } from "@/lib/errors";
import { completeTask, createTask } from "@/lib/task-service";
import { parseTaskForm, parseTaskId } from "@/lib/task-validation";

function revalidateTaskPaths(task: {
  id: string;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
}) {
  revalidatePath("/taken");
  revalidatePath("/kansen");
  if (task.dealId) revalidatePath(`/leads/${task.dealId}`);
  if (task.contactId) revalidatePath(`/contacten/${task.contactId}`);
  if (task.companyId) revalidatePath(`/bedrijven/${task.companyId}`);
}

export async function createTaskAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; createdAt?: number }> {
  try {
    const session = await requireSession();
    const input = parseTaskForm(formData);
    const task = await createTask(input, session.user.id);
    revalidateTaskPaths(task);
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
    const task = await completeTask(id, session.user.id);
    revalidateTaskPaths(task);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
