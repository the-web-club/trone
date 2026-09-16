/**
 * Gedeelde vormen voor het audit-log. Browser-safe: de client tracker, de
 * API-endpoint en de server helpers gebruiken dezelfde types.
 */
import type {
  AuditCategory,
  AuditClientEventType,
  AuditEventType,
  AuditResult,
  AuditSeverity,
  AuditSource,
} from "@/lib/audit/registry";

/** Actor-snapshot. Blijft leesbaar nadat de gebruiker verwijderd is. */
export type AuditActor = {
  userId: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
};

export const AUDIT_SYSTEM_ACTOR: AuditActor = {
  userId: null,
  name: null,
  email: null,
  role: null,
};

/** Invoer voor één server-side event. */
export type AuditEventInput = {
  eventType: AuditEventType | string;
  category: AuditCategory;
  action: string;
  /** Standaard SERVER_ACTION. */
  source?: AuditSource;
  /** Standaard INFO, of ERROR bij result FAILURE. */
  severity?: AuditSeverity;
  /** Standaard SUCCESS. */
  result?: AuditResult;

  entityType?: string | null;
  entityId?: string | null;
  entityLabel?: string | null;

  route?: string | null;
  httpMethod?: string | null;
  targetKey?: string | null;
  targetLabel?: string | null;

  metadata?: unknown;

  /**
   * Alleen zetten wanneer de actor niet uit de sessie te halen is (scripts,
   * cron, webhooks). Wordt nooit uit clientdata gevuld.
   */
  actor?: AuditActor;
  /** Alleen voor clientbatches; server events laten dit leeg. */
  clientEventId?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
  occurredAt?: Date;
};

/** Eén event zoals de browser het instuurt. Ongevalideerd. */
export type AuditClientEventPayload = {
  clientEventId: string;
  eventType: AuditClientEventType | string;
  category: string;
  action: string;
  route?: string | null;
  targetType?: string | null;
  targetKey?: string | null;
  targetLabel?: string | null;
  component?: string | null;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  entityLabel?: string | null;
  severity?: string | null;
  result?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: string;
};

export type AuditClientBatch = {
  events: AuditClientEventPayload[];
};

/** Rij zoals hij naar de database gaat. */
export type AuditEventRow = {
  id: string;
  eventType: string;
  category: string;
  action: string;
  source: string;
  severity: string;
  result: string;
  actorUserId: string | null;
  actorNameSnapshot: string | null;
  actorEmailSnapshot: string | null;
  actorRoleSnapshot: string | null;
  entityType: string | null;
  entityId: string | null;
  entityLabel: string | null;
  route: string | null;
  httpMethod: string | null;
  targetKey: string | null;
  targetLabel: string | null;
  sessionId: string | null;
  requestId: string | null;
  clientEventId: string | null;
  metadata: Record<string, unknown> | null;
  searchIndex: string | null;
  occurredAt: Date;
  eventVersion: number;
};
