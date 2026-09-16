import { getAuth } from "@/lib/auth";
import { auditActorFromSession, auditSessionId } from "@/lib/audit/context";
import { logAuditEvent } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/registry";
import { sanitizeAuditText } from "@/lib/audit/sanitize";
import { getSession } from "@/lib/auth-session";
import { getPrismaClient } from "@/lib/db";
import type { AuditActor } from "@/lib/audit/types";

export const dynamic = "force-dynamic";

/**
 * Better Auth-handler, met audit-logging eromheen.
 *
 * De logging zit hier en niet in een Better Auth-hook: het pad plus de
 * responsstatus zijn stabiele signalen die niet meebewegen met de interne
 * API van de bibliotheek. Inloggen, uitloggen en wachtwoordresets zijn precies
 * de events die een beheerder in het log wil terugvinden.
 *
 * Wat wél wordt opgeslagen bij een mislukte poging: het opgegeven e-mailadres.
 * Dat is nodig om een reeks pogingen op één account te kunnen zien; zonder dat
 * gegeven is een LOGIN_FAILED-event waardeloos. Het wachtwoord wordt nooit
 * gelezen: alleen het e-mailveld komt uit de body.
 *
 * Het IP-adres wordt bewust niet gelogd — zie docs/logs.md.
 */

type AuthEventKind =
  | "sign-in"
  | "sign-out"
  | "forget-password"
  | "reset-password";

function classifyAuthPath(pathname: string): AuthEventKind | null {
  if (pathname.includes("/sign-in")) return "sign-in";
  if (pathname.includes("/sign-out")) return "sign-out";
  if (pathname.includes("/forget-password")) return "forget-password";
  if (pathname.includes("/reset-password")) return "reset-password";
  return null;
}

/** Leest alleen het e-mailveld uit een gekloonde body. Faalt stil. */
async function readEmail(request: Request): Promise<string | null> {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return null;
    const body: unknown = await request.clone().json();
    if (body && typeof body === "object" && "email" in body) {
      return sanitizeAuditText((body as { email?: unknown }).email, 191);
    }
    return null;
  } catch {
    return null;
  }
}

async function actorForEmail(email: string | null): Promise<AuditActor> {
  if (!email) return { userId: null, name: null, email: null, role: null };
  try {
    const user = await getPrismaClient().user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) {
      // Onbekend account: geen actorUserId, maar het adres blijft leesbaar.
      return { userId: null, name: null, email, role: null };
    }
    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch {
    return { userId: null, name: null, email, role: null };
  }
}

async function logAuthEvent(
  kind: AuthEventKind,
  request: Request,
  status: number,
  /** Actor die vóór de handler is opgehaald; nodig bij uitloggen. */
  priorActor: AuditActor | null,
  priorSessionId: string | null,
): Promise<void> {
  const ok = status >= 200 && status < 300;
  const route = new URL(request.url).pathname;

  if (kind === "sign-out") {
    await logAuditEvent({
      eventType: "LOGOUT",
      category: "AUTH",
      action: AUDIT_ACTIONS.logout,
      source: "API",
      result: ok ? "SUCCESS" : "FAILURE",
      route,
      httpMethod: request.method,
      entityType: "session",
      actor: priorActor ?? { userId: null, name: null, email: null, role: null },
      sessionId: priorSessionId,
      metadata: { status },
    });
    return;
  }

  const email = await readEmail(request);

  if (kind === "sign-in") {
    const actor = await actorForEmail(email);
    await logAuditEvent({
      eventType: ok ? "LOGIN_SUCCESS" : "LOGIN_FAILED",
      category: ok ? "AUTH" : "SECURITY",
      action: ok ? AUDIT_ACTIONS.loginSuccess : AUDIT_ACTIONS.loginFailed,
      source: "API",
      result: ok ? "SUCCESS" : "FAILURE",
      severity: ok ? "INFO" : "WARNING",
      route,
      httpMethod: request.method,
      entityType: "user",
      entityId: actor.userId,
      entityLabel: actor.name ?? email,
      // Bij een mislukte poging is er geen sessie; de actor komt uit het
      // opgegeven adres, niet uit een cookie.
      actor,
      metadata: {
        status,
        ...(ok ? {} : { reden: "Ongeldige inloggegevens of geblokkeerd account" }),
      },
    });
    return;
  }

  if (kind === "forget-password") {
    const actor = await actorForEmail(email);
    await logAuditEvent({
      eventType: "PASSWORD_RESET_REQUESTED",
      category: "AUTH",
      action: AUDIT_ACTIONS.passwordResetRequest,
      source: "API",
      result: ok ? "SUCCESS" : "FAILURE",
      route,
      httpMethod: request.method,
      entityType: "user",
      entityId: actor.userId,
      actor,
      metadata: { status },
    });
    return;
  }

  await logAuditEvent({
    eventType: "PASSWORD_RESET_COMPLETED",
    category: "AUTH",
    action: AUDIT_ACTIONS.passwordResetComplete,
    source: "API",
    result: ok ? "SUCCESS" : "FAILURE",
    severity: ok ? "NOTICE" : "WARNING",
    route,
    httpMethod: request.method,
    entityType: "user",
    // Het resettoken staat in de url of de body en wordt nooit gelogd.
    actor: priorActor ?? { userId: null, name: null, email: null, role: null },
    metadata: { status },
  });
}

async function handle(request: Request): Promise<Response> {
  const kind = classifyAuthPath(new URL(request.url).pathname);

  // Bij uitloggen en het afronden van een reset is de sessie ná de handler weg;
  // de actor moet er dus vóóraf uit gehaald worden.
  let priorActor: AuditActor | null = null;
  let priorSessionId: string | null = null;
  if (kind === "sign-out" || kind === "reset-password") {
    try {
      const session = await getSession();
      if (session) {
        priorActor = auditActorFromSession(session);
        priorSessionId = auditSessionId(session);
      }
    } catch {
      // Geen sessie is een geldige uitkomst.
    }
  }

  const response = await getAuth().handler(request);

  if (kind) {
    // Logging mag het antwoord niet vertragen of laten omvallen; logAuditEvent
    // gooit nooit.
    await logAuthEvent(kind, request, response.status, priorActor, priorSessionId);
  }

  return response;
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
