import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db";
import {
  endExclusiveOfZonedDate,
  startOfZonedDate,
} from "@/lib/date-input";
import { escapeLikeTerm } from "@/lib/list-query";
import {
  AUDIT_ACTOR_SYSTEM,
  AUDIT_LOG_PAGE_SIZE,
  decodeAuditCursor,
  encodeAuditCursor,
  type AuditFilterValues,
  type AuditQueryValues,
} from "@/lib/audit-query";

/**
 * Leeskant van het audit-log.
 *
 * Twee dingen die hier bewust zo zijn:
 *
 * 1. Keyset-pagination op (occurredAt, id). Elke pagina is één indexrange op
 *    `audit_event_occurredAt_id_idx` of op de index van het actieve filter, dus
 *    er wordt nooit een groeiende OFFSET doorlopen en nooit meer dan één pagina
 *    in het geheugen gehouden.
 * 2. De filters komen uit een geparseerd, gevalideerd object (audit-query.ts).
 *    Er is geen pad waarlangs een ruwe searchParam in de `where` belandt, en er
 *    is geen scope-parameter die een client kan meesturen.
 */

export const AUDIT_LOG_MAX_PAGE_SIZE = 100;

/**
 * Bovengrens voor de totaalteller. Een COUNT over miljoenen rijen is de duurste
 * query op de pagina; boven deze grens tonen we "meer dan X".
 */
export const AUDIT_LOG_COUNT_CAP = 10_000;

export type AuditEventListRow = {
  id: string;
  occurredAt: Date;
  eventType: string;
  category: string;
  action: string;
  source: string;
  severity: string;
  result: string;
  actorUserId: string | null;
  actorNameSnapshot: string | null;
  actorEmailSnapshot: string | null;
  entityType: string | null;
  entityId: string | null;
  entityLabel: string | null;
  route: string | null;
  targetLabel: string | null;
};

export type AuditEventDetail = AuditEventListRow & {
  actorRoleSnapshot: string | null;
  httpMethod: string | null;
  targetKey: string | null;
  sessionId: string | null;
  requestId: string | null;
  clientEventId: string | null;
  metadata: Prisma.JsonValue | null;
  receivedAt: Date;
  eventVersion: number;
};

export type AuditEventPage = {
  items: AuditEventListRow[];
  /** Cursor voor de volgende (oudere) pagina, of null. */
  olderCursor: string | null;
  /** Cursor voor de vorige (nieuwere) pagina, of null. */
  newerCursor: string | null;
  pageSize: number;
};

const LIST_SELECT = {
  id: true,
  occurredAt: true,
  eventType: true,
  category: true,
  action: true,
  source: true,
  severity: true,
  result: true,
  actorUserId: true,
  actorNameSnapshot: true,
  actorEmailSnapshot: true,
  entityType: true,
  entityId: true,
  entityLabel: true,
  route: true,
  targetLabel: true,
} satisfies Prisma.AuditEventSelect;

/**
 * Zet de gevalideerde filters om in een Prisma `where`.
 *
 * Geëxporteerd zodat de tests precies deze vertaling kunnen controleren zonder
 * database.
 */
export function buildAuditEventWhere(
  filters: AuditFilterValues,
): Prisma.AuditEventWhereInput {
  const where: Prisma.AuditEventWhereInput = {};

  if (filters.type.length === 1) where.eventType = filters.type[0];
  else if (filters.type.length > 1) where.eventType = { in: filters.type };

  if (filters.categorie.length === 1) where.category = filters.categorie[0];
  else if (filters.categorie.length > 1) {
    where.category = { in: filters.categorie };
  }

  if (filters.gebruiker === AUDIT_ACTOR_SYSTEM) {
    // Systeem-, cron- en webhookevents hebben geen actor.
    where.actorUserId = null;
  } else if (filters.gebruiker) {
    where.actorUserId = filters.gebruiker;
  }

  if (filters.actie) where.action = filters.actie;
  if (filters.bron) where.source = filters.bron;
  if (filters.resultaat) where.result = filters.resultaat;
  if (filters.ernst) where.severity = filters.ernst;
  if (filters.entiteit) where.entityType = filters.entiteit;

  if (filters.van || filters.tot) {
    const range: Prisma.DateTimeFilter = {};
    // De datumvelden zijn kalenderdagen in Europe/Amsterdam, zoals overal in
    // de app; `tot` is inclusief en wordt dus een exclusieve dag erna.
    if (filters.van) range.gte = startOfZonedDate(filters.van);
    if (filters.tot) range.lt = endExclusiveOfZonedDate(filters.tot);
    where.occurredAt = range;
  }

  if (filters.zoeken) {
    // Zoeken loopt over het afgeleide `searchIndex`-veld: één LIKE in plaats
    // van vier OR's over action, route, entityLabel en actor-snapshot.
    where.searchIndex = {
      contains: escapeLikeTerm(filters.zoeken.toLowerCase()),
    };
  }

  return where;
}

/**
 * Eén pagina audit-events, nieuwste eerst.
 *
 * `richting: "nieuwer"` draait de query om en spiegelt het resultaat terug, zodat
 * "Vorige" net zo goedkoop is als "Volgende" en er geen cursorstack in de URL
 * hoeft te staan.
 */
export async function listAuditEvents(
  values: AuditQueryValues,
  pageSize = AUDIT_LOG_PAGE_SIZE,
): Promise<AuditEventPage> {
  const take = Math.min(Math.max(pageSize, 1), AUDIT_LOG_MAX_PAGE_SIZE);
  const where = buildAuditEventWhere(values);
  const cursor = decodeAuditCursor(values.cursor);
  const backwards = values.richting === "nieuwer" && cursor !== null;

  const keyset: Prisma.AuditEventWhereInput | null = cursor
    ? backwards
      ? {
          OR: [
            { occurredAt: { gt: cursor.occurredAt } },
            { occurredAt: cursor.occurredAt, id: { gt: cursor.id } },
          ],
        }
      : {
          OR: [
            { occurredAt: { lt: cursor.occurredAt } },
            { occurredAt: cursor.occurredAt, id: { lt: cursor.id } },
          ],
        }
    : null;

  const scopedWhere: Prisma.AuditEventWhereInput = keyset
    ? { AND: [where, keyset] }
    : where;

  // Eén rij extra: verklapt of er nog een pagina achter zit zonder tweede query.
  const rows = await getPrismaClient().auditEvent.findMany({
    where: scopedWhere,
    select: LIST_SELECT,
    orderBy: backwards
      ? [{ occurredAt: "asc" }, { id: "asc" }]
      : [{ occurredAt: "desc" }, { id: "desc" }],
    take: take + 1,
  });

  const hasExtra = rows.length > take;
  const page = hasExtra ? rows.slice(0, take) : rows;
  const items = backwards ? [...page].reverse() : page;

  const first = items[0];
  const last = items[items.length - 1];

  const hasNewer = backwards ? hasExtra : cursor !== null;
  const hasOlder = backwards ? true : hasExtra;

  return {
    items,
    pageSize: take,
    newerCursor:
      hasNewer && first
        ? encodeAuditCursor({ occurredAt: first.occurredAt, id: first.id })
        : null,
    olderCursor:
      hasOlder && last
        ? encodeAuditCursor({ occurredAt: last.occurredAt, id: last.id })
        : null,
  };
}

export type AuditEventCount = {
  total: number;
  /** True wanneer de teller op AUDIT_LOG_COUNT_CAP is afgekapt. */
  capped: boolean;
};

/**
 * Aantal gevonden events. Afgekapt op AUDIT_LOG_COUNT_CAP zodat een breed
 * filter geen volledige tabelscan wordt.
 */
export async function countAuditEvents(
  filters: AuditFilterValues,
): Promise<AuditEventCount> {
  const total = await getPrismaClient().auditEvent.count({
    where: buildAuditEventWhere(filters),
    take: AUDIT_LOG_COUNT_CAP + 1,
  });
  return total > AUDIT_LOG_COUNT_CAP
    ? { total: AUDIT_LOG_COUNT_CAP, capped: true }
    : { total, capped: false };
}

/** Eén event voor de detaildrawer. Alleen lezen; er is geen mutatiepad. */
export async function getAuditEvent(
  id: string,
): Promise<AuditEventDetail | null> {
  if (!id) return null;
  return getPrismaClient().auditEvent.findUnique({
    where: { id },
    select: {
      ...LIST_SELECT,
      actorRoleSnapshot: true,
      httpMethod: true,
      targetKey: true,
      sessionId: true,
      requestId: true,
      clientEventId: true,
      metadata: true,
      receivedAt: true,
      eventVersion: true,
    },
  });
}

export type AuditActorOption = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
};

/**
 * Gebruikers voor het actorfilter. Uit de `user`-tabel en niet uit een DISTINCT
 * over het log: dat laatste is een scan over alle events.
 *
 * Inactieve accounts staan er wel bij, want hun oude events blijven in het log.
 */
export async function listAuditActorOptions(): Promise<AuditActorOption[]> {
  const users = await getPrismaClient().user.findMany({
    select: { id: true, name: true, email: true, isActive: true },
    orderBy: [{ name: "asc" }],
  });
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
  }));
}

/**
 * Actor-snapshot van een gebruiker die niet meer in de `user`-tabel staat, zodat
 * een filter op een verwijderde gebruiker toch een naam kan tonen.
 */
export async function findAuditActorSnapshot(
  actorUserId: string,
): Promise<{ name: string | null; email: string | null } | null> {
  if (!actorUserId) return null;
  const row = await getPrismaClient().auditEvent.findFirst({
    where: { actorUserId },
    select: { actorNameSnapshot: true, actorEmailSnapshot: true },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
  });
  if (!row) return null;
  return { name: row.actorNameSnapshot, email: row.actorEmailSnapshot };
}
