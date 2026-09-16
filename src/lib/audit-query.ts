/**
 * URL-parameters voor Instellingen > Logs.
 *
 * Zelfde conventie als de andere lijsten (companies-query.ts, deals-query.ts):
 * parsen en href-bouwen staan hier, niet in de pagina of de filtercomponent.
 * Daardoor blijft een gefilterde logweergave deelbaar en herlaadbaar.
 *
 * Pagination is keyset in plaats van offset. Een audit-log groeit hard en
 * `OFFSET 40000` laat MariaDB alle voorgaande rijen doorlopen; met een cursor op
 * (occurredAt, id) blijft elke pagina één indexrange.
 */
import {
  allSearchParams,
  firstSearchParam,
  setIfPresent,
  toListHref,
} from "@/lib/list-query";
import {
  AUDIT_CATEGORIES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
  AUDIT_RESULTS,
  AUDIT_SEVERITIES,
  AUDIT_SOURCES,
} from "@/lib/audit/registry";

export const AUDIT_LOG_PATH = "/instellingen/logs";
export const AUDIT_LOG_PAGE_SIZE = 50;

/** Richting van de keyset-cursor. `ouder` is de standaard: nieuwste bovenaan. */
export type AuditCursorDirection = "ouder" | "nieuwer";

export type AuditFilterValues = {
  /** Vrije tekst op actie, route, doelobject en actor-snapshot. */
  zoeken: string;
  /** Meerkeuze: één of meer event types. */
  type: string[];
  /** Meerkeuze: één of meer categorieën. */
  categorie: string[];
  /** Eén gebruiker, of "systeem" voor events zonder actor. */
  gebruiker: string;
  actie: string;
  bron: string;
  resultaat: string;
  ernst: string;
  entiteit: string;
  /** Datum zonder tijd, in de vorm jjjj-mm-dd. */
  van: string;
  tot: string;
};

export type AuditQueryValues = AuditFilterValues & {
  cursor?: string;
  richting?: AuditCursorDirection;
  /** Id van het event waarvan het detail open staat. Houdt de drawer deelbaar. */
  log?: string;
};

/** Sentinel voor het filter "alleen systeemevents" (actorUserId is null). */
export const AUDIT_ACTOR_SYSTEM = "systeem";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseEnumList(
  values: string[],
  allowed: readonly string[],
): string[] {
  const wanted = new Set<string>();
  for (const raw of values) {
    for (const part of raw.split(",")) {
      const normalized = part.trim().toUpperCase();
      if (normalized && allowed.includes(normalized)) wanted.add(normalized);
    }
  }
  return [...wanted];
}

function parseEnumSingle(
  value: string | null | undefined,
  allowed: readonly string[],
): string {
  const normalized = value?.trim().toUpperCase() ?? "";
  return normalized && allowed.includes(normalized) ? normalized : "";
}

function parseDateOnly(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!DATE_ONLY_RE.test(trimmed)) return "";
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? "" : trimmed;
}

function parseEntityType(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return (AUDIT_ENTITY_TYPES as readonly string[]).includes(trimmed)
    ? trimmed
    : "";
}

export function parseAuditCursorDirection(
  value: string | null | undefined,
): AuditCursorDirection {
  return value?.trim().toLowerCase() === "nieuwer" ? "nieuwer" : "ouder";
}

export function parseAuditSearchParams(
  params: Record<string, string | string[] | undefined>,
): AuditQueryValues {
  const van = parseDateOnly(firstSearchParam(params, "van"));
  const tot = parseDateOnly(firstSearchParam(params, "tot"));
  // Een omgekeerd bereik levert altijd nul rijen op; stil omdraaien is
  // vriendelijker dan een lege lijst zonder uitleg.
  const flip = Boolean(van && tot && van > tot);

  return {
    zoeken: firstSearchParam(params, "zoeken").trim().slice(0, 120),
    type: parseEnumList(allSearchParams(params, "type"), AUDIT_EVENT_TYPES),
    categorie: parseEnumList(
      allSearchParams(params, "categorie"),
      AUDIT_CATEGORIES,
    ),
    gebruiker: firstSearchParam(params, "gebruiker").trim().slice(0, 191),
    actie: firstSearchParam(params, "actie").trim().toLowerCase().slice(0, 96),
    bron: parseEnumSingle(firstSearchParam(params, "bron"), AUDIT_SOURCES),
    resultaat: parseEnumSingle(
      firstSearchParam(params, "resultaat"),
      AUDIT_RESULTS,
    ),
    ernst: parseEnumSingle(firstSearchParam(params, "ernst"), AUDIT_SEVERITIES),
    entiteit: parseEntityType(firstSearchParam(params, "entiteit")),
    van: flip ? tot : van,
    tot: flip ? van : tot,
    cursor: firstSearchParam(params, "cursor").trim().slice(0, 80) || undefined,
    richting: parseAuditCursorDirection(firstSearchParam(params, "richting")),
    log: firstSearchParam(params, "log").trim().slice(0, 191) || undefined,
  };
}

export function buildAuditLogHref(values: Partial<AuditQueryValues>): string {
  const query = new URLSearchParams();
  setIfPresent(query, "zoeken", values.zoeken);
  for (const type of values.type ?? []) query.append("type", type);
  for (const category of values.categorie ?? []) {
    query.append("categorie", category);
  }
  setIfPresent(query, "gebruiker", values.gebruiker);
  setIfPresent(query, "actie", values.actie);
  setIfPresent(query, "bron", values.bron);
  setIfPresent(query, "resultaat", values.resultaat);
  setIfPresent(query, "ernst", values.ernst);
  setIfPresent(query, "entiteit", values.entiteit);
  setIfPresent(query, "van", values.van);
  setIfPresent(query, "tot", values.tot);
  if (values.cursor) {
    query.set("cursor", values.cursor);
    if (values.richting === "nieuwer") query.set("richting", "nieuwer");
  }
  setIfPresent(query, "log", values.log);
  return toListHref(AUDIT_LOG_PATH, query);
}

/**
 * Href naar dezelfde filters, maar terug op de eerste pagina en met het
 * detailvenster gesloten.
 */
export function buildAuditFilterHref(
  values: Partial<AuditQueryValues>,
): string {
  return buildAuditLogHref({
    ...values,
    cursor: undefined,
    richting: "ouder",
    log: undefined,
  });
}

export function emptyAuditFilters(): AuditFilterValues {
  return {
    zoeken: "",
    type: [],
    categorie: [],
    gebruiker: "",
    actie: "",
    bron: "",
    resultaat: "",
    ernst: "",
    entiteit: "",
    van: "",
    tot: "",
  };
}

export function hasActiveAuditFilters(values: AuditFilterValues): boolean {
  return Boolean(
    values.zoeken ||
      values.type.length ||
      values.categorie.length ||
      values.gebruiker ||
      values.actie ||
      values.bron ||
      values.resultaat ||
      values.ernst ||
      values.entiteit ||
      values.van ||
      values.tot,
  );
}

// ---------------------------------------------------------------------
// Cursor
// ---------------------------------------------------------------------

export type AuditCursor = { occurredAt: Date; id: string };

/**
 * `<ms>_<uuid>`. Bewust geen base64: dit is geen geheim, en leesbaar in de
 * adresbalk is handiger bij support.
 */
export function encodeAuditCursor(cursor: AuditCursor): string {
  return `${cursor.occurredAt.getTime()}_${cursor.id}`;
}

export function decodeAuditCursor(
  value: string | null | undefined,
): AuditCursor | null {
  if (!value) return null;
  const separator = value.indexOf("_");
  if (separator <= 0) return null;
  const millis = Number(value.slice(0, separator));
  const id = value.slice(separator + 1);
  if (!Number.isFinite(millis) || !id) return null;
  const occurredAt = new Date(millis);
  if (Number.isNaN(occurredAt.getTime())) return null;
  return { occurredAt, id };
}
