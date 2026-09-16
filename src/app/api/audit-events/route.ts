import { z } from "zod";
import { buildAuditEventRow } from "@/lib/audit/build";
import { auditActorFromSession, auditSessionId } from "@/lib/audit/context";
import { AUDIT_CLIENT_BATCH_LIMIT, recordAuditEventBatch } from "@/lib/audit/log";
import {
  AUDIT_LIMITS,
  isAuditClientCategory,
  isAuditClientEventType,
  isAuditResult,
  isAuditSeverity,
  normalizeAuditAction,
  normalizeAuditEventType,
} from "@/lib/audit/registry";
import { sanitizeAuditRoute } from "@/lib/audit/sanitize";
import { getSession } from "@/lib/auth-session";
import type { AuditEventRow } from "@/lib/audit/types";

/**
 * Ingest voor clientevents: POST /api/audit-events
 *
 * Alles wat identiteit of vertrouwen raakt wordt hier server-side bepaald:
 *
 *   - actor en sessie komen uit de sessiecookie, nooit uit de payload;
 *   - `source` is altijd CLIENT, ongeacht wat er ingestuurd wordt;
 *   - `eventType` en `category` moeten in de client-allowlist staan, zodat een
 *     browser geen CREATE, DELETE of LOGIN_SUCCESS in het log kan zetten;
 *   - metadata gaat door de centrale sanitizer;
 *   - de batch is hard begrensd;
 *   - `clientEventId` is uniek in de database, dus een netwerkherhaling levert
 *     geen tweede rij op.
 *
 * De endpoint logt zichzelf niet: er wordt geen audit-event geschreven over het
 * verwerken van audit-events.
 */

export const dynamic = "force-dynamic";

const clientEventSchema = z.object({
  clientEventId: z.string().min(8).max(AUDIT_LIMITS.clientEventId),
  eventType: z.string().min(1).max(AUDIT_LIMITS.eventType),
  category: z.string().min(1).max(AUDIT_LIMITS.category),
  action: z.string().min(1).max(AUDIT_LIMITS.action),
  route: z.string().max(2048).nullish(),
  targetType: z.string().max(64).nullish(),
  targetKey: z.string().max(512).nullish(),
  targetLabel: z.string().max(512).nullish(),
  component: z.string().max(128).nullish(),
  href: z.string().max(2048).nullish(),
  entityType: z.string().max(AUDIT_LIMITS.entityType).nullish(),
  entityId: z.string().max(AUDIT_LIMITS.entityId).nullish(),
  entityLabel: z.string().max(512).nullish(),
  severity: z.string().max(AUDIT_LIMITS.severity).nullish(),
  result: z.string().max(AUDIT_LIMITS.result).nullish(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
  occurredAt: z.string().min(1).max(40),
});

const batchSchema = z.object({
  events: z.array(clientEventSchema).min(1).max(AUDIT_CLIENT_BATCH_LIMIT),
});

/**
 * Best-effort rem per gebruiker binnen deze isolate. Geen vervanging voor een
 * echte rate limiter, maar het houdt een doorgeslagen tab of een lus in eigen
 * code weg bij de database.
 */
const RATE_WINDOW_MS = 10_000;
const RATE_MAX_EVENTS = 400;
const rateBuckets = new Map<string, { windowStart: number; count: number }>();

function exceedsRateLimit(userId: string, events: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(userId, { windowStart: now, count: events });
    // Geheugen begrensd houden; dit is een cache, geen boekhouding.
    if (rateBuckets.size > 500) {
      for (const [key, value] of rateBuckets) {
        if (now - value.windowStart > RATE_WINDOW_MS) rateBuckets.delete(key);
      }
    }
    return false;
  }
  bucket.count += events;
  return bucket.count > RATE_MAX_EVENTS;
}

function parseOccurredAt(value: string, now: Date): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return now;
  // Een client kan een verkeerd ingestelde klok hebben of liegen over de tijd.
  // Toekomst wordt naar nu getrokken; te oude events ook, zodat een event nooit
  // buiten het datumfilter van de logpagina valt.
  const maxSkewMs = 24 * 60 * 60 * 1000;
  if (parsed.getTime() > now.getTime()) return now;
  if (now.getTime() - parsed.getTime() > maxSkewMs) return now;
  return parsed;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Ongeldige payload." }, { status: 400 });
  }

  const parsed = batchSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: "Ongeldige batch.", stored: 0 },
      { status: 400 },
    );
  }

  const actor = auditActorFromSession(session);
  if (!actor.userId) {
    return Response.json({ error: "Niet ingelogd." }, { status: 401 });
  }
  if (exceedsRateLimit(actor.userId, parsed.data.events.length)) {
    return Response.json(
      { error: "Te veel events.", stored: 0 },
      { status: 429 },
    );
  }

  const sessionId = auditSessionId(session);
  const now = new Date();
  const rows: AuditEventRow[] = [];
  let rejected = 0;

  for (const event of parsed.data.events) {
    const eventType = normalizeAuditEventType(event.eventType);
    const category = event.category.trim().toUpperCase();

    // Buiten de allowlist: stil weigeren. Een 400 op de hele batch zou één
    // verkeerd event de rest laten kosten.
    if (!isAuditClientEventType(eventType) || !isAuditClientCategory(category)) {
      rejected += 1;
      continue;
    }

    const route = sanitizeAuditRoute(event.route, AUDIT_LIMITS.route);
    if (route?.startsWith("/api/audit-events")) {
      rejected += 1;
      continue;
    }

    rows.push(
      buildAuditEventRow(
        {
          eventType,
          category,
          action: normalizeAuditAction(event.action),
          // Altijd CLIENT: dit is per definitie een browserevent.
          source: "CLIENT",
          severity: isAuditSeverity(event.severity?.toUpperCase())
            ? (event.severity?.toUpperCase() as never)
            : undefined,
          result: isAuditResult(event.result?.toUpperCase())
            ? (event.result?.toUpperCase() as never)
            : "SUCCESS",
          entityType: event.entityType ?? null,
          entityId: event.entityId ?? null,
          entityLabel: event.entityLabel ?? null,
          route,
          httpMethod: null,
          targetKey: event.targetKey ?? null,
          targetLabel: event.targetLabel ?? null,
          clientEventId: event.clientEventId,
          // Uit de sessie, niet uit de payload.
          sessionId,
          occurredAt: parseOccurredAt(event.occurredAt, now),
          metadata: {
            ...(event.metadata ?? {}),
            ...(event.targetType ? { doelsoort: event.targetType } : {}),
            ...(event.component ? { component: event.component } : {}),
            ...(event.href ? { href: event.href } : {}),
          },
        },
        { actor, now },
      ),
    );
  }

  if (rows.length === 0) {
    return Response.json({ stored: 0, rejected }, { status: 202 });
  }

  try {
    const result = await recordAuditEventBatch(rows);
    return Response.json(
      {
        stored: result.stored,
        received: result.received,
        // Verschil tussen received en stored zijn duplicaten op clientEventId.
        duplicates: result.received - result.stored,
        rejected,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("Audit-batch kon niet worden opgeslagen:", error);
    return Response.json({ error: "Opslaan mislukt." }, { status: 503 });
  }
}
