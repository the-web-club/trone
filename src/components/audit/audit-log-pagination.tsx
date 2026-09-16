import Link from "next/link";
import { pageActionSecondaryClassName } from "@/components/shell/page-header";

/**
 * Keyset-pagination voor het audit-log.
 *
 * Geen paginanummers: bij een append-only log dat blijft groeien is "pagina 37"
 * geen stabiele plek, en een OFFSET daarheen laat de database alle voorgaande
 * rijen doorlopen. In plaats daarvan twee richtingen langs de tijdlijn, met de
 * cursor in de URL zodat een pagina deelbaar blijft.
 */
export function AuditLogPagination({
  newerHref,
  olderHref,
  rangeLabel,
}: {
  newerHref: string | null;
  olderHref: string | null;
  rangeLabel: string;
}) {
  if (!newerHref && !olderHref) return null;

  return (
    <nav className="page-pagination" aria-label="Paginering">
      <p className="text-sm text-fg-muted">{rangeLabel}</p>
      <div className="flex gap-2">
        {newerHref ? (
          <Link
            href={newerHref}
            scroll={false}
            className={pageActionSecondaryClassName()}
            data-audit-action="ui.log_page_newer"
            data-audit-target="audit-log-newer"
          >
            Nieuwer
          </Link>
        ) : null}
        {olderHref ? (
          <Link
            href={olderHref}
            scroll={false}
            className={pageActionSecondaryClassName()}
            data-audit-action="ui.log_page_older"
            data-audit-target="audit-log-older"
          >
            Ouder
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
