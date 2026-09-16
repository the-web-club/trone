import {
  getSessionRole,
  isAdminSession,
  type AppSession,
} from "@/lib/auth-session";
import { AppError } from "@/lib/errors";

/**
 * Leesrechten op het audit-log.
 *
 * Dit hangt aan de bestaande rolstructuur (`admin` | `user` | `viewer`) uit
 * src/lib/auth-session.ts. Er is met opzet geen tweede rechtenmodel bijgebouwd.
 *
 * TRÔNE is single-tenant (zie de kop van prisma/schema.prisma): er is geen
 * organizationId en dus ook geen organisatiescope om af te dwingen. De isolatie
 * die er wél is, wordt hier bewaakt:
 *
 *   - alleen `admin` mag het log lezen; `user` en `viewer` krijgen niets;
 *   - de queryfilters accepteren nooit een scope, actor of id uit clientdata
 *     als bron van waarheid — zie src/lib/audit/query.ts;
 *   - de schrijfkant bepaalt actor en sessie server-side uit de sessie.
 */

/** Alleen een beheerder mag het log inzien. */
export function canViewAuditLog(role: string): boolean {
  return role === "admin";
}

/** De gesaniteerde ruwe JSON is voor dezelfde groep als het log zelf. */
export function canViewAuditRawMetadata(role: string): boolean {
  return role === "admin";
}

export function assertCanViewAuditLog(session: AppSession): void {
  if (!isAdminSession(session)) {
    throw new AppError(
      "Alleen een beheerder mag de logs bekijken.",
      "FORBIDDEN",
      403,
    );
  }
}

export function auditLogRole(session: AppSession): string {
  return getSessionRole(session);
}
