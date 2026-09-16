/**
 * Browsertransport voor audit-events.
 *
 * Eén wachtrij per tab, één endpoint. Componenten die iets willen loggen roepen
 * `trackAuditEvent()` aan; dat is synchroon en doet nooit netwerk.
 *
 * Volgorde van transport:
 *   1. `navigator.sendBeacon` bij het verlaten van de pagina — dat is het enige
 *      dat een unload betrouwbaar overleeft.
 *   2. `fetch` met `keepalive` als beacon niet bestaat of weigert.
 *
 * Beide zijn fire-and-forget: er wordt nooit op gewacht in een klik-, navigatie-
 * of formulierpad.
 */
import {
  AUDIT_QUEUE_DEFAULTS,
  createAuditQueue,
  type AuditQueue,
} from "@/lib/audit/client-queue";
import {
  sanitizeAuditHref,
  sanitizeAuditMetadata,
  sanitizeAuditRoute,
  sanitizeAuditText,
} from "@/lib/audit/sanitize";
import type { AuditClientEventPayload } from "@/lib/audit/types";

export const AUDIT_EVENTS_ENDPOINT = "/api/audit-events";

/**
 * Requests naar de endpoint zelf worden nooit gelogd. Zonder deze uitsluiting
 * logt een klik op de logpagina een event, dat een request veroorzaakt, dat...
 */
export function isAuditIgnoredRoute(route: string | null): boolean {
  if (!route) return false;
  return route.startsWith(AUDIT_EVENTS_ENDPOINT);
}

function newClientEventId(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
    return cryptoRef.randomUUID();
  }
  // Fallback voor oudere browsers en niet-secure contexts. Hoeft niet
  // cryptografisch te zijn: het is een dedup-sleutel, geen geheim.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

async function postEvents(
  events: AuditClientEventPayload[],
  options: { final: boolean },
): Promise<boolean> {
  if (typeof window === "undefined" || events.length === 0) return true;
  const body = JSON.stringify({ events });

  if (options.final && typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(AUDIT_EVENTS_ENDPOINT, blob)) return true;
    } catch {
      // Doorvallen naar fetch.
    }
  }

  try {
    const response = await fetch(AUDIT_EVENTS_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
      cache: "no-store",
    });
    // 4xx is definitief: opnieuw proberen heeft geen zin en de wachtrij moet
    // de batch laten vallen. Alleen 5xx en netwerkfouten mogen een retry krijgen.
    if (response.status >= 400 && response.status < 500) return true;
    return response.ok;
  } catch {
    return false;
  }
}

let queue: AuditQueue | null = null;

function getQueue(): AuditQueue | null {
  if (typeof window === "undefined") return null;
  if (!queue) {
    queue = createAuditQueue({
      send: postEvents,
      maxBatch: AUDIT_QUEUE_DEFAULTS.maxBatch,
    });
  }
  return queue;
}

export type TrackAuditEventInput = {
  eventType: string;
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
};

/**
 * Zet één event in de wachtrij. Synchroon, en gooit nooit: een fout in logging
 * mag geen klik of navigatie stukmaken.
 */
export function trackAuditEvent(input: TrackAuditEventInput): void {
  try {
    const target = getQueue();
    if (!target) return;

    const route =
      sanitizeAuditRoute(input.route ?? window.location.pathname) ?? null;
    if (isAuditIgnoredRoute(route)) return;

    target.enqueue({
      clientEventId: newClientEventId(),
      eventType: input.eventType,
      category: input.category,
      action: input.action,
      route,
      targetType: sanitizeAuditText(input.targetType, 32),
      targetKey: sanitizeAuditText(input.targetKey, 191),
      targetLabel: sanitizeAuditText(input.targetLabel, 191),
      component: sanitizeAuditText(input.component, 64),
      href: input.href ? sanitizeAuditHref(input.href, 191) : null,
      entityType: sanitizeAuditText(input.entityType, 48),
      entityId: sanitizeAuditText(input.entityId, 191),
      entityLabel: sanitizeAuditText(input.entityLabel, 191),
      severity: sanitizeAuditText(input.severity, 16),
      result: sanitizeAuditText(input.result, 16),
      metadata: sanitizeAuditMetadata(input.metadata),
      occurredAt: new Date().toISOString(),
    });
  } catch {
    // Bewust stil.
  }
}

/** Stuurt de wachtrij nu weg. `final` bij pagehide en visibilitychange. */
export function flushAuditEvents(options: { final?: boolean } = {}): void {
  try {
    void getQueue()?.flush(options);
  } catch {
    // Bewust stil.
  }
}

/** Alleen voor tests: gooit de singleton weg. */
export function resetAuditQueueForTests(): void {
  queue?.dispose();
  queue = null;
}
