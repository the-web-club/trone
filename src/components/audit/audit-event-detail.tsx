"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  auditActorLabel,
  auditMetadataEntries,
  auditRouteLabel,
  auditTargetLabel,
  auditTimestampParts,
} from "@/lib/audit/format";
import {
  auditCategoryLabel,
  auditEntityTypeLabel,
  auditEventTypeLabel,
  auditResultLabel,
  auditResultTone,
  auditSeverityLabel,
  auditSourceLabel,
} from "@/lib/audit/registry";

/**
 * Detailvenster van één logregel.
 *
 * Op mobiel schuift dit van onderaf op boven de bottom navigation — hetzelfde
 * bottom-sheetgedrag als het mobiele filterpaneel in ListFilterToolbar. De
 * inhoud is server-side opgehaald en als props doorgegeven; er wordt hier niets
 * bijgeladen.
 *
 * Er zit geen bewerk- of verwijderactie in: events zijn append-only.
 */

export type AuditEventDetailView = {
  id: string;
  occurredAt: Date;
  receivedAt: Date;
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
  metadata: unknown;
  eventVersion: number;
};

export function AuditEventDetail({
  event,
  closeHref,
  canViewRaw,
}: {
  event: AuditEventDetailView;
  /** Href zonder de `log`-parameter; sluiten is een navigatie, dus deelbaar. */
  closeHref: string;
  canViewRaw: boolean;
}) {
  const router = useRouter();
  const [showRaw, setShowRaw] = useState(false);
  const occurred = auditTimestampParts(event.occurredAt);
  const received = auditTimestampParts(event.receivedAt);
  const metadata = auditMetadataEntries(event.metadata);

  function close() {
    router.replace(closeHref, { scroll: false });
  }

  return (
    <DialogRoot
      open
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent size="lg" data-audit-target="audit-log-detail">
        <DialogHeader>
          <DialogTitle>{auditEventTypeLabel(event.eventType)}</DialogTitle>
          <p className="text-sm text-fg-muted">
            {occurred.date} om {occurred.time} · {auditActorLabel(event)}
          </p>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-4 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={auditResultTone(event.result, event.severity)}>
                {auditResultLabel(event.result)}
              </Badge>
              <Badge>{auditCategoryLabel(event.category)}</Badge>
              <Badge>{auditSourceLabel(event.source)}</Badge>
              {event.severity !== "INFO" ? (
                <Badge tone="warning">
                  {auditSeverityLabel(event.severity)}
                </Badge>
              ) : null}
            </div>

            <DetailSection title="Wat er gebeurde">
              <DetailRow label="Actie" mono>
                {event.action}
              </DetailRow>
              <DetailRow label="Doelobject">
                {auditTargetLabel(event)}
              </DetailRow>
              {event.entityType ? (
                <DetailRow label="Soort object">
                  {auditEntityTypeLabel(event.entityType)}
                </DetailRow>
              ) : null}
              {event.entityId ? (
                <DetailRow label="Object-id" mono>
                  {event.entityId}
                </DetailRow>
              ) : null}
              {event.targetKey ? (
                <DetailRow label="Element" mono>
                  {event.targetKey}
                </DetailRow>
              ) : null}
              {event.targetLabel ? (
                <DetailRow label="Elementlabel">{event.targetLabel}</DetailRow>
              ) : null}
            </DetailSection>

            <DetailSection title="Waar en door wie">
              <DetailRow label="Gebruiker">{auditActorLabel(event)}</DetailRow>
              {event.actorEmailSnapshot ? (
                <DetailRow label="E-mail">{event.actorEmailSnapshot}</DetailRow>
              ) : null}
              {event.actorRoleSnapshot ? (
                <DetailRow label="Rol">{event.actorRoleSnapshot}</DetailRow>
              ) : null}
              {!event.actorUserId ? (
                <DetailRow label="Herkomst">
                  Systeemactie zonder gebruiker
                </DetailRow>
              ) : null}
              <DetailRow label="Route" mono>
                {auditRouteLabel(event.route)}
              </DetailRow>
              {event.httpMethod ? (
                <DetailRow label="HTTP-methode">{event.httpMethod}</DetailRow>
              ) : null}
            </DetailSection>

            <DetailSection title="Metadata">
              {metadata.length === 0 ? (
                <p className="text-sm text-fg-muted">
                  Geen aanvullende metadata bij dit event.
                </p>
              ) : (
                metadata.map((entry) => (
                  <DetailRow key={entry.key} label={entry.label}>
                    {entry.value}
                  </DetailRow>
                ))
              )}
            </DetailSection>

            <DetailSection title="Techniek">
              <DetailRow label="Event-id" mono>
                {event.id}
              </DetailRow>
              {event.sessionId ? (
                <DetailRow label="Sessie" mono>
                  {event.sessionId}
                </DetailRow>
              ) : null}
              {event.requestId ? (
                <DetailRow label="Request" mono>
                  {event.requestId}
                </DetailRow>
              ) : null}
              {event.clientEventId ? (
                <DetailRow label="Client-event-id" mono>
                  {event.clientEventId}
                </DetailRow>
              ) : null}
              <DetailRow label="Ontvangen">
                {received.date} om {received.time}
              </DetailRow>
              <DetailRow label="Eventversie">{event.eventVersion}</DetailRow>
            </DetailSection>

            {canViewRaw && event.metadata != null ? (
              <DetailSection title="Ruwe metadata">
                {showRaw ? (
                  <pre className="max-h-64 overflow-auto rounded-sm border border-border bg-surface-sunk p-3 font-mono text-xs whitespace-pre-wrap text-fg-muted">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-fg-muted">
                    De gesaniteerde JSON zoals die is opgeslagen. Gevoelige
                    velden zijn er bij het loggen al uit gehaald.
                  </p>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowRaw((value) => !value)}
                  data-audit-action="ui.log_raw_toggle"
                  data-audit-target="audit-log-raw-json"
                >
                  {showRaw ? "Verberg ruwe JSON" : "Bekijk ruwe JSON"}
                </Button>
              </DetailSection>
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={close}>
            Sluiten
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-label font-medium text-fg-muted">{title}</h3>
      <dl className="flex flex-col gap-1">{children}</dl>
    </section>
  );
}

function DetailRow({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-3 gap-y-0.5 border-b border-border/60 py-1 last:border-b-0">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd
        className={
          mono
            ? "min-w-0 font-mono text-xs break-all text-fg"
            : "min-w-0 text-sm break-words text-fg"
        }
      >
        {children}
      </dd>
    </div>
  );
}
