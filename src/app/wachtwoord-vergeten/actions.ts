"use server";

import { AppError, toActionError } from "@/lib/errors";
import { requestPasswordReset } from "@/lib/user-service";
import { parsePasswordResetEmail } from "@/lib/user-validation";

export async function requestPasswordResetAction(
  _prev: { error?: string; sent?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; sent?: boolean }> {
  try {
    const email = parsePasswordResetEmail(formData);
    await requestPasswordReset(email);
    return { sent: true };
  } catch (error) {
    if (error instanceof AppError) return toActionError(error);
    console.error("Wachtwoord reset aanvragen mislukt:", error);
    return { error: "Versturen van de e-mail is mislukt." };
  }
}
