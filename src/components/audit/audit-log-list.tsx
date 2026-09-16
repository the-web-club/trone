import Link from "next/link";
import {
  ListCard,
  ListCardDate,
  ListCardEmpty,
  ListCardHeader,
  ListCardMeta,
  ListCardRow,
  ListCardRows,
  ListCardSignals,
  ListCardTitle,
  ResponsiveListView,
} from "@/components/ui/responsive-list";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmptyRow,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import {
  auditActorLabel,
  auditRouteLabel,
  auditTargetLabel,
  auditTimestampParts,
} from "@/lib/audit/format";
import {
  auditCategoryLabel,
  auditEventTypeLabel,
  auditResultLabel,
  auditResultTone,
  auditSeverityLabel,
  auditSeverityTone,
  auditSourceLabel,
} from "@/lib/audit/registry";
import type { AuditEventListRow } from "@/lib/audit/query";

/**
 * Tabel (desktop) en compacte kaarten (mobiel) voor het audit-log.
 *
 * Een rij is een link naar dezelfde pagina met `?log=<id>`; het detail komt
 * server-side uit de database. Zo blijft een geopend logregel deelbaar en wordt
 * er geen extra clientverzoek gedaan.
 */
export function AuditLogList({
  items,
  hrefForEvent,
  emptyMessage,
}: {
  items: AuditEventListRow[];
  hrefForEvent: (id: string) => string;
  emptyMessage: React.ReactNode;
}) {
  const desktop = (
    <TableContainer scrollHint>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Datum en tijd</TableHeaderCell>
            <TableHeaderCell>Gebruiker</TableHeaderCell>
            <TableHeaderCell>Event</TableHeaderCell>
            <TableHeaderCell>Categorie</TableHeaderCell>
            <TableHeaderCell>Actie</TableHeaderCell>
            <TableHeaderCell>Doelobject</TableHeaderCell>
            <TableHeaderCell>Route</TableHeaderCell>
            <TableHeaderCell>Bron</TableHeaderCell>
            <TableHeaderCell>Resultaat</TableHeaderCell>
            <TableHeaderCell>Ernst</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableEmptyRow colSpan={10}>{emptyMessage}</TableEmptyRow>
          ) : (
            items.map((event) => {
              const stamp = auditTimestampParts(event.occurredAt);
              return (
                <TableRow key={event.id} interactive>
                  <TableCell>
                    <Link
                      href={hrefForEvent(event.id)}
                      scroll={false}
                      className="text-fg hover:underline"
                      data-audit-action="ui.log_detail_open"
                      data-audit-target="audit-log-row"
                      data-audit-label="Logregel openen"
                    >
                      <span className="whitespace-nowrap tabular-nums">
                        {stamp.date}
                      </span>{" "}
                      <span className="whitespace-nowrap tabular-nums text-fg-muted">
                        {stamp.time}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>{auditActorLabel(event)}</TableCell>
                  <TableCell>{auditEventTypeLabel(event.eventType)}</TableCell>
                  <TableCell className="text-fg-muted">
                    {auditCategoryLabel(event.category)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-fg-muted">
                    {event.action}
                  </TableCell>
                  <TableCell className="text-fg-muted">
                    {auditTargetLabel(event)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-fg-muted">
                    {auditRouteLabel(event.route)}
                  </TableCell>
                  <TableCell className="text-fg-muted">
                    {auditSourceLabel(event.source)}
                  </TableCell>
                  <TableCell>
                    <Badge tone={auditResultTone(event.result, event.severity)}>
                      {auditResultLabel(event.result)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {event.severity === "INFO" ? (
                      <span className="text-fg-subtle">—</span>
                    ) : (
                      <Badge tone={auditSeverityTone(event.severity)}>
                        {auditSeverityLabel(event.severity)}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const mobile =
    items.length === 0 ? (
      <ListCardEmpty>{emptyMessage}</ListCardEmpty>
    ) : (
      items.map((event) => {
        const stamp = auditTimestampParts(event.occurredAt);
        return (
          <ListCard key={event.id} interactive>
            <ListCardHeader>
              {/*
                De titel is de belangrijkste informatie: wat er gebeurde. Datum
                staat ernaast, de rest zit in twee compacte rijen. De volledige
                metadata komt in het detailvenster.
              */}
              <ListCardTitle href={hrefForEvent(event.id)}>
                {auditEventTypeLabel(event.eventType)}
              </ListCardTitle>
              <ListCardDate>
                {stamp.date}
                <br />
                <span className="tabular-nums">{stamp.time}</span>
              </ListCardDate>
            </ListCardHeader>
            <ListCardMeta>{auditActorLabel(event)}</ListCardMeta>
            <ListCardSignals>
              <Badge tone={auditResultTone(event.result, event.severity)}>
                {auditResultLabel(event.result)}
              </Badge>
              <span className="text-xs text-fg-muted">
                {auditCategoryLabel(event.category)}
              </span>
              <span className="text-xs text-fg-subtle">
                {auditSourceLabel(event.source)}
              </span>
            </ListCardSignals>
            <ListCardRows>
              <ListCardRow label="Actie" span="full">
                <span className="font-mono text-xs">{event.action}</span>
              </ListCardRow>
              <ListCardRow label="Doelobject" span="full">
                {auditTargetLabel(event)}
              </ListCardRow>
              <ListCardRow label="Route" span="full">
                <span className="font-mono text-xs">
                  {auditRouteLabel(event.route)}
                </span>
              </ListCardRow>
            </ListCardRows>
          </ListCard>
        );
      })
    );

  return <ResponsiveListView desktop={desktop} mobile={mobile} />;
}
