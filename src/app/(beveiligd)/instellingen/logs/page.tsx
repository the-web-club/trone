import type { Metadata } from "next";
import { AuditEventDetail } from "@/components/audit/audit-event-detail";
import { AuditLogFilters } from "@/components/audit/audit-log-filters";
import { AuditLogList } from "@/components/audit/audit-log-list";
import { AuditLogPagination } from "@/components/audit/audit-log-pagination";
import { ListBody, ListBrowser } from "@/components/list/list-browser";
import { PageHeader, PageHeaderNavLink } from "@/components/shell/page-header";
import {
  assertCanViewAuditLog,
  auditLogRole,
  canViewAuditRawMetadata,
} from "@/lib/audit/access";
import {
  AUDIT_LOG_COUNT_CAP,
  countAuditEvents,
  findAuditActorSnapshot,
  getAuditEvent,
  listAuditActorOptions,
  listAuditEvents,
} from "@/lib/audit/query";
import {
  AUDIT_ACTOR_SYSTEM,
  buildAuditLogHref,
  hasActiveAuditFilters,
  parseAuditSearchParams,
} from "@/lib/audit-query";
import { requireSession } from "@/lib/auth-session";
import { formatCount } from "@/lib/format";
import { listSummary } from "@/lib/list-copy";

export const metadata: Metadata = { title: "Logs" };

/**
 * Instellingen > Logs
 *
 * Server-side gepagineerd (keyset), server-side gefilterd en server-side
 * gerechtigd. Er is geen clientpad dat alle logs ophaalt: de pagina levert één
 * pagina rijen en, als `?log=` gezet is, één detailrecord.
 *
 * De rechten lopen via `assertCanViewAuditLog`, dus alleen een beheerder komt
 * hier binnen. Niet-beheerders krijgen dezelfde 403 als bij andere
 * beheerdersacties, in plaats van een lege lijst die toegang suggereert.
 */
export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  assertCanViewAuditLog(session);
  const role = auditLogRole(session);

  const parsed = parseAuditSearchParams(await searchParams);
  const hasFilters = hasActiveAuditFilters(parsed);

  const [page, count, actors, detail] = await Promise.all([
    listAuditEvents(parsed),
    countAuditEvents(parsed),
    listAuditActorOptions(),
    parsed.log ? getAuditEvent(parsed.log) : Promise.resolve(null),
  ]);

  // Een filter op een gebruiker die niet meer in de user-tabel staat moet toch
  // een naam kunnen tonen. Die komt uit de snapshot in het log zelf.
  const unknownActor =
    parsed.gebruiker &&
    parsed.gebruiker !== AUDIT_ACTOR_SYSTEM &&
    !actors.some((actor) => actor.id === parsed.gebruiker)
      ? await findAuditActorSnapshot(parsed.gebruiker)
      : null;

  const totalLabel = count.capped
    ? `Meer dan ${formatCount(AUDIT_LOG_COUNT_CAP)} events`
    : count.total === 0 && hasFilters
      ? "Geen resultaten"
      : listSummary(count.total, "event", "events");

  const emptyMessage = hasFilters
    ? "Geen events gevonden voor deze filters. Pas de periode of de filters aan."
    : "Nog geen events vastgelegd. Zodra er iets gebeurt in de applicatie verschijnt het hier.";

  return (
    <ListBrowser>
      <PageHeader
        title="Logs"
        nav={
          <PageHeaderNavLink href="/instellingen">
            Terug naar instellingen
          </PageHeaderNavLink>
        }
        description="Alle gebruikersinteracties, business-events, systeemacties en beveiligingsacties. Events zijn append-only en kunnen niet worden gewijzigd of verwijderd."
        meta={[totalLabel]}
      />

      <AuditLogFilters
        values={parsed}
        actors={actors}
        unknownActorLabel={unknownActor?.name ?? unknownActor?.email ?? null}
      />

      <ListBody>
        <AuditLogList
          items={page.items}
          emptyMessage={emptyMessage}
          hrefForEvent={(id) => buildAuditLogHref({ ...parsed, log: id })}
        />
        <AuditLogPagination
          rangeLabel={
            page.items.length === 0
              ? "Geen events"
              : `${formatCount(page.items.length)} van ${totalLabel.toLowerCase()}`
          }
          newerHref={
            page.newerCursor
              ? buildAuditLogHref({
                  ...parsed,
                  log: undefined,
                  cursor: page.newerCursor,
                  richting: "nieuwer",
                })
              : null
          }
          olderHref={
            page.olderCursor
              ? buildAuditLogHref({
                  ...parsed,
                  log: undefined,
                  cursor: page.olderCursor,
                  richting: "ouder",
                })
              : null
          }
        />
      </ListBody>

      {detail ? (
        <AuditEventDetail
          event={detail}
          canViewRaw={canViewAuditRawMetadata(role)}
          closeHref={buildAuditLogHref({ ...parsed, log: undefined })}
        />
      ) : null}
    </ListBrowser>
  );
}
