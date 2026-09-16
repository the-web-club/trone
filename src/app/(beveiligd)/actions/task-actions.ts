"use server";

import { revalidatePath } from "next/cache";
import { requireWritableSession } from "@/lib/auth-session";
import { toActionError } from "@/lib/errors";
import { parseSubmissionId } from "@/lib/form-submission";
import {
  completeTask,
  createFollowUpTask,
  deleteTask,
  reopenTask,
  updateFollowUpTask,
} from "@/lib/task-service";
import {
  parseCreateFollowUpForm,
  parseTaskId,
  parseUpdateFollowUpForm,
} from "@/lib/task-validation";

function revalidateTaskPaths() {
  revalidatePath("/taken");
  revalidatePath("/leads", "layout");
  revalidatePath("/contacten", "layout");
  revalidatePath("/bedrijven", "layout");
}

export async function createFollowUpTaskAction(
  _prev: { error?: string; createdAt?: number } | null,
  formData: FormData,
): Promise<{ error?: string; fieldErrors?: Record<string, string>; createdAt?: number }> {
  try {
    const session = await requireWritableSession();
    const submissionId = parseSubmissionId(formData.get("submissionId"));
    const input = parseCreateFollowUpForm(formData);
    await createFollowUpTask(
      {
        ...input,
        assigneeUserId: session.user.id,
        createdByUserId: session.user.id,
      },
      { submissionId },
    );
    revalidateTaskPaths();
    return { createdAt: Date.now() };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateFollowUpTaskAction(
  _prev: { error?: string; savedAt?: number } | null,
  formData: FormData,
): Promise<{ error?: string; fieldErrors?: Record<string, string>; savedAt?: number }> {
  try {
    await requireWritableSession();
    const input = parseUpdateFollowUpForm(formData);
    await updateFollowUpTask(input.id, input);
    revalidateTaskPaths();
    return { savedAt: Date.now() };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteTaskAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireWritableSession();
    const id = parseTaskId(formData);
    await deleteTask(id);
    revalidateTaskPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
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
