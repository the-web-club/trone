import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, type Auth } from "@/lib/auth";
import {
  createAuthErrorSlot,
  runWithAuthErrorSlot,
} from "@/lib/auth-error-capture";
import { AUDIT_ACTIONS } from "@/lib/audit/registry";
import { AUDIT_SYSTEM_ACTOR } from "@/lib/audit/types";
import { AppError, describeError } from "@/lib/errors";

export type AppSession = NonNullable<
  Awaited<ReturnType<Auth["api"]["getSession"]>>
>;

export const getSession = cache(
  async function getSession(): Promise<AppSession | null> {
    const requestHeaders = await headers();
    const slot = createAuthErrorSlot();
    try {
      return await runWithAuthErrorSlot(slot, () =>
        getAuth().api.getSession({ headers: requestHeaders }),
      );
    } catch (error) {
      await reportSessionReadFailure(error, slot.error);
      throw error;
    }
  },
);

/**
 * Legt vast dat het lezen van de sessie is mislukt, mét de onderliggende fout.
 *
 * Dit gebeurt hier en niet in `instrumentation.ts` omdat dit de laatste plek is
 * waar de echte fout nog bestaat. Wat er daarna nog van over is, is de
 * vervangende `APIError: Failed to get session` van Better Auth — een melding
 * die voor elke denkbare oorzaak hetzelfde luidt.
 *
 * De console-regel staat los van het audit-event, met opzet: gaat de database
 * onderuit, dan mislukt de audit-insert net zo hard als de sessielezing, en dan
 * is de serverlog de enige plek waar de oorzaak nog terechtkomt.
 *
 * Actor en sessie gaan bewust leeg mee. Niet alleen omdat we ze op dit moment
 * niet kennen: zonder die twee velden haalt `logAuditEvent` zelf `getSession()`
 * op, en die aanroep staat hier nog open. `cache()` geeft dan dezelfde nog niet
 * afgeronde promise terug en het request loopt vast. Wie het was, is terug te
 * vinden via de `server.error`-regel met hetzelfde request-id.
 */
async function reportSessionReadFailure(
  error: unknown,
  captured: unknown,
): Promise<void> {
  const thrown = describeError(error);
  const underlying =
    captured ?? (error instanceof Error ? error.cause : null) ?? null;
  const cause = underlying === null ? null : describeError(underlying);

  console.error(
    `Sessie lezen mislukt (${thrown.soort}: ${thrown.melding}). Oorzaak:`,
    underlying ?? "onbekend",
  );

  try {
    const { logAuditEvent } = await import("@/lib/audit/log");
    await logAuditEvent({
      eventType: "SERVER_ERROR",
      category: "AUTH",
      action: AUDIT_ACTIONS.sessionReadFailed,
      source: "API",
      result: "FAILURE",
      severity: "ERROR",
      entityType: "session",
      actor: AUDIT_SYSTEM_ACTOR,
      sessionId: null,
      metadata: {
        melding: thrown.melding,
        soort: thrown.soort,
        oorzaak: cause?.melding ?? null,
        oorzaaksoort: cause?.soort ?? null,
        oorzaakcode: cause?.code ?? null,
        herkomst: captured != null ? "logger" : cause ? "cause" : null,
      },
    });
  } catch {
    // De console-regel hierboven is het vangnet.
  }
}

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
    const { logAuditEvent } = await import("@/lib/audit/log");
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
