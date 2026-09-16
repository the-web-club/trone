/**
 * Weergavehelpers voor de logpagina. Puur, zodat de tekst die de gebruiker
 * ziet los te testen is van de rendering.
 */
import {
  APP_TIME_ZONE,
  calendarDateInTimeZone,
  clockTimeInTimeZone,
} from "@/lib/date-input";
import { auditEntityTypeLabel } from "@/lib/audit/registry";

export type AuditActorLike = {
  actorUserId: string | null;
  actorNameSnapshot: string | null;
  actorEmailSnapshot: string | null;
};

/**
 * Naam van de actor. Valt terug op de snapshot en daarna op "Systeem", zodat een
 * verwijderde gebruiker leesbaar blijft en een systeemevent niet leeg is.
 */
export function auditActorLabel(event: AuditActorLike): string {
  if (!event.actorUserId) return "Systeem";
  return (
    event.actorNameSnapshot ||
    event.actorEmailSnapshot ||
    "Verwijderde gebruiker"
  );
}

export function auditActorSubLabel(event: AuditActorLike): string | null {
  if (!event.actorUserId) return null;
  if (event.actorNameSnapshot && event.actorEmailSnapshot) {
    return event.actorEmailSnapshot;
  }
  return null;
}

export type AuditTargetLike = {
  entityType: string | null;
  entityId: string | null;
  entityLabel: string | null;
  targetLabel: string | null;
};

/** Doelobject in één regel: label als het er is, anders soort en id. */
export function auditTargetLabel(event: AuditTargetLike): string {
  if (event.entityLabel) {
    return event.entityType
      ? `${auditEntityTypeLabel(event.entityType)}: ${event.entityLabel}`
      : event.entityLabel;
  }
  if (event.entityType && event.entityId) {
    return `${auditEntityTypeLabel(event.entityType)} ${event.entityId.slice(0, 8)}`;
  }
  if (event.entityType) return auditEntityTypeLabel(event.entityType);
  if (event.targetLabel) return event.targetLabel;
  return "—";
}

/** Datum en tijd gesplitst, zodat de tabel twee regels kan tonen. */
export function auditTimestampParts(value: Date): {
  date: string;
  time: string;
} {
  return {
    date: calendarDateInTimeZone(value, APP_TIME_ZONE),
    time: clockTimeInTimeZone(value, APP_TIME_ZONE),
  };
}

/** Route zonder leidende slash, of "—". Puur cosmetisch. */
export function auditRouteLabel(route: string | null): string {
  if (!route || route === "/") return route === "/" ? "/" : "—";
  return route;
}

export type AuditMetadataEntry = { key: string; label: string; value: string };

const METADATA_LABELS: Record<string, string> = {
  van: "Vorige pagina",
  heeftFilters: "Met filters",
  gewijzigd: "Gewijzigde filters",
  doelsoort: "Soort element",
  component: "Component",
  href: "Link",
  melding: "Melding",
  soort: "Soort fout",
  oorzaak: "Onderliggende fout",
  oorzaaksoort: "Soort onderliggende fout",
  oorzaakcode: "Foutcode",
  herkomst: "Herkomst oorzaak",
  context: "Route-context",
  renderbron: "Renderbron",
  router: "Router",
  bestand: "Bestand",
  regel: "Regel",
  reden: "Reden",
  rol: "Rol",
  vorige: "Vorige waarde",
  nieuwe: "Nieuwe waarde",
  velden: "Gewijzigde velden",
  aantal: "Aantal",
  status: "Status",
  code: "Code",
  _afgekapt: "Metadata afgekapt",
  zoeken_lengte: "Lengte zoekterm",
};

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Ja" : "Nee";
  if (Array.isArray(value)) {
    return value.length === 0
      ? "—"
      : value.map((item) => formatMetadataValue(item)).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Zet gesaniteerde metadata om in een leesbare key-value-lijst. Geneste
 * objecten worden platgeslagen met een puntpad, zodat de drawer geen boom hoeft
 * te renderen.
 */
export function auditMetadataEntries(
  metadata: unknown,
  prefix = "",
  depth = 0,
): AuditMetadataEntry[] {
  if (metadata == null || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }
  const entries: AuditMetadataEntry[] = [];
  for (const [key, value] of Object.entries(metadata)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      depth < 3
    ) {
      entries.push(...auditMetadataEntries(value, path, depth + 1));
      continue;
    }
    entries.push({
      key: path,
      label: METADATA_LABELS[key] ?? key,
      value: formatMetadataValue(value),
    });
  }
  return entries;
}
