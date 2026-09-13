import "server-only";

import { getPrismaClient } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { isThemePreference, type ThemePreference } from "@/lib/theme";

export async function updateUserThemePreference(
  userId: string,
  preference: ThemePreference,
) {
  if (!isThemePreference(preference)) {
    throw new AppError("Kies licht, donker of systeem.", "VALIDATION");
  }

  const prisma = getPrismaClient();
  return prisma.user.update({
    where: { id: userId },
    data: { themePreference: preference },
  });
}
