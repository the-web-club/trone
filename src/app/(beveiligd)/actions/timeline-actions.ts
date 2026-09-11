"use server";

import { revalidatePath } from "next/cache";
import {
  requireAdmin,
  requireWritableSession,
} from "@/lib/auth-session";
import { toActionError } from "@/lib/errors";
import {
  parseTimelineEventForm,
  parseTimelineEventId,
  parseUpdateTimelineEventForm,
} from "@/lib/timeline-validation";
import {
  deleteTimelineEvent,
  logEvent,
  updateTimelineEvent,
} from "@/lib/timeline-service";

function revalidateTimelinePaths() {
  revalidatePath("/leads", "layout");
  revalidatePath("/contacten", "layout");
  revalidatePath("/bedrijven", "layout");
  revalidatePath("/taken");
}

export async function createTimelineEventAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; loggedAt?: number }> {
  try {
    const session = await requireWritableSession();
    const input = parseTimelineEventForm(formData);
    await logEvent({
      type: input.type,
      body: input.body ?? null,
      occurredAt: input.occurredAt,
      direction: input.direction,
      outcome: input.outcome,
      userId: session.user.id,
      dealId: input.dealId,
      contactId: input.contactId,
      companyId: input.companyId,
      followUp: input.followUp,
    });
    revalidateTimelinePaths();
    return { loggedAt: Date.now() };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateTimelineEventAction(
  _prev: { error?: string; savedAt?: number } | null,
  formData: FormData,
): Promise<{ error?: string; savedAt?: number }> {
  try {
    await requireWritableSession();
    const input = parseUpdateTimelineEventForm(formData);
    await updateTimelineEvent(input.id, {
      type: input.type,
      body: input.body,
    });
    revalidateTimelinePaths();
    return { savedAt: Date.now() };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteTimelineEventAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const id = parseTimelineEventId(formData);
    await deleteTimelineEvent(id);
    revalidateTimelinePaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
