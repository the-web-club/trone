"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-session";
import { toActionError } from "@/lib/errors";
import { parseLetterheadForm } from "@/lib/letterhead-validation";
import { updateLetterhead, updateThresholds } from "@/lib/settings-service";
import { parseThresholdsForm } from "@/lib/settings-validation";

export async function updateThresholdsAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const input = parseThresholdsForm(formData);
    await updateThresholds(input);
    revalidatePath("/instellingen/drempels");
    revalidatePath("/kansen");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateLetterheadAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const input = parseLetterheadForm(formData);
    await updateLetterhead(input);
    revalidatePath("/instellingen/bedrijfsgegevens");
    revalidatePath("/offertes", "layout");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
