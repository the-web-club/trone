import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, type Auth } from "@/lib/auth";
import { AppError } from "@/lib/errors";

export type AppSession = NonNullable<
  Awaited<ReturnType<Auth["api"]["getSession"]>>
>;

export const getSession = cache(
  async function getSession(): Promise<AppSession | null> {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    return session;
  },
);

export async function requireSession(): Promise<AppSession> {
  const session = await getSession();
  if (!session) {
    redirect("/inloggen");
  }
  return session;
}

export function getSessionRole(session: AppSession): string {
  const role = (session.user as { role?: string | null }).role;
  return role ?? "user";
}

export function isAdminSession(session: AppSession): boolean {
  return getSessionRole(session) === "admin";
}

export function isViewerSession(session: AppSession): boolean {
  return getSessionRole(session) === "viewer";
}

/**
 * Legt een geweigerde poging vast in het audit-log.
 *
 * Dynamische import met opzet: `@/lib/audit/log` leest de actor uit de sessie en
 * zou bij een statische import een cyclus met dit bestand vormen. De aanroep
 * wordt afgewacht omdat er direct daarna een fout wordt gegooid — een
 * losgelaten promise zou op een serverless runtime worden afgekapt.
 */
async function logPermissionDenied(
  session: AppSession,
  reason: string,
): Promise<void> {
  try {
    const [{ logAuditEvent }, { AUDIT_ACTIONS }] = await Promise.all([
      import("@/lib/audit/log"),
      import("@/lib/audit/registry"),
    ]);
    await logAuditEvent({
      eventType: "PERMISSION_DENIED",
      category: "SECURITY",
      action: AUDIT_ACTIONS.permissionDenied,
      result: "DENIED",
      severity: "WARNING",
      entityType: "user",
      entityId: session.user.id,
      metadata: { reden: reason, rol: getSessionRole(session) },
    });
  } catch {
    // Nooit de reden dat een guard omvalt.
  }
}

export async function requireAdmin(): Promise<AppSession> {
  const session = await requireSession();
  if (!isAdminSession(session)) {
    await logPermissionDenied(session, "Beheerdersrecht vereist");
    throw new AppError("Alleen een beheerder mag dit doen.", "FORBIDDEN", 403);
  }
  return session;
}

export async function requireWritableSession(): Promise<AppSession> {
  const session = await requireSession();
  if (isViewerSession(session)) {
    await logPermissionDenied(session, "Schrijfrecht vereist");
    throw new AppError(
      "Een alleen-lezen account mag dit niet wijzigen.",
      "FORBIDDEN",
      403,
    );
  }
  return session;
}
