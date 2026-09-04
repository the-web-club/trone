"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-session";
import { toActionError } from "@/lib/errors";
import { parseTimelineEventForm } from "@/lib/timeline-validation";
import { logEvent } from "@/lib/timeline-service";

function revalidateTimelinePaths(links: {
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
}) {
  if (links.dealId) revalidatePath(`/leads/${links.dealId}`);
  if (links.contactId) revalidatePath(`/contacten/${links.contactId}`);
  if (links.companyId) revalidatePath(`/bedrijven/${links.companyId}`);
  revalidatePath("/leads");
  revalidatePath("/contacten");
  revalidatePath("/bedrijven");
}

export async function createTimelineEventAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; loggedAt?: number }> {
  try {
    const session = await requireSession();
    const input = parseTimelineEventForm(formData);
    const event = await logEvent({
      type: input.type,
      body: input.body ?? null,
      userId: session.user.id,
      dealId: input.dealId,
      contactId: input.contactId,
      companyId: input.companyId,
    });
    revalidateTimelinePaths({
      dealId: event.dealId,
      contactId: event.contactId,
      companyId: event.companyId,
    });
    return { loggedAt: Date.now() };
  } catch (error) {
    return toActionError(error);
  }
}
