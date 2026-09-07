"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-session";
import { toActionError } from "@/lib/errors";
import { parseTimelineEventForm } from "@/lib/timeline-validation";
import { logEvent } from "@/lib/timeline-service";

function revalidateTimelinePaths() {
  revalidatePath("/leads", "layout");
  revalidatePath("/contacten", "layout");
  revalidatePath("/bedrijven", "layout");
}

export async function createTimelineEventAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; loggedAt?: number }> {
  try {
    const session = await requireSession();
    const input = parseTimelineEventForm(formData);
    await logEvent({
      type: input.type,
      body: input.body ?? null,
      userId: session.user.id,
      dealId: input.dealId,
      contactId: input.contactId,
      companyId: input.companyId,
    });
    revalidateTimelinePaths();
    return { loggedAt: Date.now() };
  } catch (error) {
    return toActionError(error);
  }
}
