import "server-only";

import { headers } from "next/headers";
import { getSession, getSessionRole, type AppSession } from "@/lib/auth-session";
import { AUDIT_LIMITS } from "@/lib/audit/registry";
import { sanitizeAuditRoute, sanitizeAuditText } from "@/lib/audit/sanitize";
import { AUDIT_SYSTEM_ACTOR, type AuditActor } from "@/lib/audit/types";

/**
 * Actor en requestcontext voor server-side events.
 *
 * De actor komt altijd uit de sessie, nooit uit een parameter die de browser
 * kan zetten. Buiten een request (scripts, seeds, cron) leveren deze functies
 * de systeemactor: `actorUserId` null, `source` SYSTEM.
 */

export function auditActorFromSession(session: AppSession): AuditActor {
  const user = session.user as {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  return {
    userId: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    role: getSessionRole(session),
  };
}

/**
 * Haalt de actor uit de huidige sessie. Faalt nooit: buiten een request­context
 * of zonder sessie is het resultaat de systeemactor, zodat een audit-event nooit
 * de aanroeper laat omvallen.
 */
export async function resolveAuditActor(): Promise<AuditActor> {
  try {
    const session = await getSession();
    if (!session) return AUDIT_SYSTEM_ACTOR;
    return auditActorFromSession(session);
  } catch {
    return AUDIT_SYSTEM_ACTOR;
  }
}

export type AuditRequestContext = {
  route: string | null;
  requestId: string | null;
  sessionId: string | null;
};

const EMPTY_REQUEST_CONTEXT: AuditRequestContext = {
  route: null,
  requestId: null,
  sessionId: null,
};

/**
 * Route en request-id van het huidige request.
 *
 * Een server action heeft geen eigen pathname; Next stuurt de pagina waarvan de
 * action is aangeroepen mee in `next-url` (en anders in `referer`). Dat is de
 * route waar de gebruiker stond, en dus precies wat de logpagina wil tonen.
 *
 * Het IP-adres wordt bewust niet gelezen. Zie docs/logs.md.
 */
export async function resolveAuditRequestContext(): Promise<AuditRequestContext> {
  try {
    const headerList = await headers();
    const route = sanitizeAuditRoute(
      headerList.get("next-url") ?? headerList.get("referer"),
      AUDIT_LIMITS.route,
    );
    const requestId = sanitizeAuditText(
      headerList.get("x-request-id") ?? headerList.get("x-vercel-id"),
      AUDIT_LIMITS.requestId,
    );
    return { route, requestId, sessionId: null };
  } catch {
    return EMPTY_REQUEST_CONTEXT;
  }
}

/** Sessie-id uit de sessie zelf; nooit uit een header of clientveld. */
export function auditSessionId(session: AppSession | null): string | null {
  if (!session) return null;
  const raw = (session.session as { id?: string | null } | undefined)?.id;
  return sanitizeAuditText(raw, AUDIT_LIMITS.sessionId);
}
