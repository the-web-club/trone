/**
 * Pure omzetting van event-invoer naar een databaserij.
 *
 * Bewust los van `log.ts`: hier zit geen Prisma, geen sessie en geen
 * `server-only`, zodat de normalisatie- en saniteerregels los te testen zijn en
 * de client-endpoint dezelfde code gebruikt als de server helpers.
 */
import { createId } from "@/lib/id";
import {
  AUDIT_LIMITS,
  isAuditResult,
  isAuditSeverity,
  isAuditSource,
  normalizeAuditAction,
  normalizeAuditEventType,
  type AuditResult,
  type AuditSeverity,
} from "@/lib/audit/registry";
import {
  buildAuditSearchIndex,
  sanitizeAuditMetadata,
  sanitizeAuditRoute,
  sanitizeAuditText,
} from "@/lib/audit/sanitize";
import {
  AUDIT_SYSTEM_ACTOR,
  type AuditActor,
  type AuditEventInput,
  type AuditEventRow,
} from "@/lib/audit/types";

const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

function normalizeHttpMethod(value: unknown): string | null {
  const text = sanitizeAuditText(value, AUDIT_LIMITS.httpMethod);
  if (!text) return null;
  const upper = text.toUpperCase();
  return (HTTP_METHODS as readonly string[]).includes(upper) ? upper : null;
}

/**
 * Een FAILURE zonder expliciete severity is een ERROR, en een DENIED een
 * WARNING. Anders staat de helft van de fouten als INFO in het log.
 */
function defaultSeverity(result: AuditResult): AuditSeverity {
  if (result === "FAILURE") return "ERROR";
  if (result === "DENIED") return "WARNING";
  if (result === "PARTIAL") return "WARNING";
  return "INFO";
}

export type BuildAuditEventOptions = {
  actor?: AuditActor;
  /** Wordt gebruikt als het event zelf geen occurredAt meegeeft. */
  now?: Date;
  /** Voor tests; standaard een nieuwe UUID. */
  id?: string;
};

export function buildAuditEventRow(
  input: AuditEventInput,
  options: BuildAuditEventOptions = {},
): AuditEventRow {
  const actor = input.actor ?? options.actor ?? AUDIT_SYSTEM_ACTOR;
  const result: AuditResult = isAuditResult(input.result)
    ? input.result
    : "SUCCESS";
  const severity: AuditSeverity = isAuditSeverity(input.severity)
    ? input.severity
    : defaultSeverity(result);
  const source = isAuditSource(input.source) ? input.source : "SERVER_ACTION";

  const entityLabel = sanitizeAuditText(input.entityLabel, AUDIT_LIMITS.label);
  const targetLabel = sanitizeAuditText(input.targetLabel, AUDIT_LIMITS.label);
  const action = normalizeAuditAction(String(input.action ?? ""));
  const route = sanitizeAuditRoute(input.route, AUDIT_LIMITS.route);
  const actorName = sanitizeAuditText(actor.name, AUDIT_LIMITS.label);
  const actorEmail = sanitizeAuditText(actor.email, AUDIT_LIMITS.label);

  const occurredAt =
    input.occurredAt && !Number.isNaN(input.occurredAt.getTime())
      ? input.occurredAt
      : (options.now ?? new Date());

  return {
    id: options.id ?? createId(),
    eventType: normalizeAuditEventType(String(input.eventType ?? "")),
    category: sanitizeAuditText(input.category, AUDIT_LIMITS.category) ?? "SYSTEM",
    action,
    source,
    severity,
    result,
    actorUserId: sanitizeAuditText(actor.userId, AUDIT_LIMITS.entityId),
    actorNameSnapshot: actorName,
    actorEmailSnapshot: actorEmail,
    actorRoleSnapshot: sanitizeAuditText(actor.role, AUDIT_LIMITS.source),
    entityType: sanitizeAuditText(input.entityType, AUDIT_LIMITS.entityType),
    entityId: sanitizeAuditText(input.entityId, AUDIT_LIMITS.entityId),
    entityLabel,
    route,
    httpMethod: normalizeHttpMethod(input.httpMethod),
    targetKey: sanitizeAuditText(input.targetKey, AUDIT_LIMITS.targetKey),
    targetLabel,
    sessionId: sanitizeAuditText(input.sessionId, AUDIT_LIMITS.sessionId),
    requestId: sanitizeAuditText(input.requestId, AUDIT_LIMITS.requestId),
    clientEventId: sanitizeAuditText(
      input.clientEventId,
      AUDIT_LIMITS.clientEventId,
    ),
    metadata: sanitizeAuditMetadata(input.metadata),
    searchIndex: buildAuditSearchIndex([
      action,
      route,
      entityLabel,
      targetLabel,
      actorName,
      actorEmail,
    ]),
    occurredAt,
    eventVersion: 1,
  };
}
