import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db";
import { buildAuditEventRow } from "@/lib/audit/build";
import {
  auditSessionId,
  resolveAuditActor,
  resolveAuditRequestContext,
} from "@/lib/audit/context";
import { getSession } from "@/lib/auth-session";
import type { AuditEventInput, AuditEventRow } from "@/lib/audit/types";

/**
 * Schrijfkant van het audit-log.
 *
 * Twee paden, met opzet verschillend gedrag:
 *
 * - `logAuditEvent()` is fire-and-forget vanuit het oogpunt van de aanroeper:
 *   een mislukte logregel mag nooit een gebruikersactie laten falen. De fout
 *   wordt gemeld op de server en verder ingeslikt.
 * - `logAuditEventTx()` schrijft binnen een bestaande transactie en gooit wél.
 *   Gebruik die waar een geslaagde mutatie niet zonder audit-event mag eindigen:
 *   valt de logregel om, dan rolt de mutatie mee terug.
 *
 * Rijen zijn append-only. Dit bestand bevat daarom geen update- of delete-pad,
 * en er is er ook nergens anders één.
 */

/** Prisma client of transactieclient; beide hebben `auditEvent.create`. */
type AuditWriter = Pick<PrismaClient, "auditEvent">;

/** Ruimte voor een clientbatch; hard begrensd in de endpoint. */
export const AUDIT_CLIENT_BATCH_LIMIT = 40;

function toCreateData(row: AuditEventRow): Prisma.AuditEventCreateManyInput {
  return {
    ...row,
    metadata: (row.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
  };
}

/**
 * Vult de velden aan die uit het request komen wanneer de aanroeper ze niet
 * meegeeft: actor uit de sessie, route en request-id uit de headers.
 */
async function withRequestContext(
  input: AuditEventInput,
): Promise<AuditEventRow> {
  const [actor, context, session] = await Promise.all([
    input.actor ? Promise.resolve(input.actor) : resolveAuditActor(),
    resolveAuditRequestContext(),
    input.sessionId ? Promise.resolve(null) : getSession().catch(() => null),
  ]);

  return buildAuditEventRow(
    {
      ...input,
      route: input.route ?? context.route,
      requestId: input.requestId ?? context.requestId,
      sessionId: input.sessionId ?? auditSessionId(session),
    },
    { actor },
  );
}

/**
 * Logt één server-side event. Gooit nooit.
 *
 * Wordt bewust ge-`await`d in plaats van als los promise achtergelaten: op een
 * serverless runtime wordt werk na het antwoord afgekapt, en dan zou het event
 * stil verdwijnen. De insert is één rij op een index-only tabel.
 */
export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    const row = await withRequestContext(input);
    await getPrismaClient().auditEvent.create({ data: toCreateData(row) });
  } catch (error) {
    // Logging mag de gebruikersactie niet blokkeren. Wel zichtbaar maken dat
    // het log een gat heeft, anders debug je later een stilte.
    console.error("Audit-event kon niet worden opgeslagen:", error);
  }
}

/**
 * Logt binnen een bestaande transactie en gooit bij een fout, zodat de mutatie
 * meerolt. Gebruik dit voor mutaties waar het audit-event bewijswaarde heeft.
 *
 * De actor moet hier expliciet mee, omdat de transactie geen sessiecontext
 * hoort op te halen terwijl er een rijlock open staat.
 */
export async function logAuditEventTx(
  tx: AuditWriter,
  input: AuditEventInput,
): Promise<void> {
  const row = buildAuditEventRow(input);
  await tx.auditEvent.create({ data: toCreateData(row) });
}

/**
 * Slaat een gevalideerde clientbatch op.
 *
 * `skipDuplicates` in combinatie met de unique index op `clientEventId` maakt
 * een netwerkherhaling gratis idempotent: dezelfde batch twee keer versturen
 * levert één rij per event op. Twee echte kliks hebben twee verschillende
 * clientEventId's en blijven dus twee events.
 *
 * Retourneert hoeveel rijen daadwerkelijk zijn toegevoegd.
 */
export async function recordAuditEventBatch(
  rows: AuditEventRow[],
): Promise<{ received: number; stored: number }> {
  if (rows.length === 0) return { received: 0, stored: 0 };
  const result = await getPrismaClient().auditEvent.createMany({
    data: rows.map(toCreateData),
    skipDuplicates: true,
  });
  return { received: rows.length, stored: result.count };
}
