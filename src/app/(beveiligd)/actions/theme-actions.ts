"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-session";
import { toActionError } from "@/lib/errors";
import { persistThemeCookies } from "@/lib/theme-cookies";
import { updateUserThemePreference } from "@/lib/theme-service";
import { parseThemePreference, type ThemePreference } from "@/lib/theme";

export async function updateThemePreferenceAction(
  preference: ThemePreference,
): Promise<{ error?: string; preference?: ThemePreference }> {
  try {
    const session = await requireSession();
    const next = parseThemePreference(preference);
    if (!next) {
      return { error: "Kies licht, donker of systeem." };
    }
    await updateUserThemePreference(session.user.id, next);
    await persistThemeCookies(next, next === "system" ? null : next);
    revalidatePath("/", "layout");
    revalidatePath("/instellingen");
    revalidatePath("/instellingen/weergave");
    return { preference: next };
  } catch (error) {
    return toActionError(error);
  }
}
