import "server-only";

import { logAuditEvent } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/registry";
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
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { themePreference: preference },
  });
  await logAuditEvent({
    eventType: "UPDATE",
    category: "SETTINGS",
    action: AUDIT_ACTIONS.settingsTheme,
    entityType: "user",
    entityId: updated.id,
    entityLabel: updated.name,
    metadata: { voorkeur: preference },
  });
  return updated;
}
