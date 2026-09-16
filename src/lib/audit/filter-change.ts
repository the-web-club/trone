/**
 * Leidt uit een verandering van de querystring af wát de gebruiker deed.
 *
 * Filters, zoeken, sorteren en pagineren gaan in deze app allemaal via de URL
 * (zie de `*-query.ts`-modules). Door de URL centraal te vergelijken hoeft er
 * geen logging in elke filtercomponent te staan, en blijft het gedrag gelijk
 * voor lijsten die later worden toegevoegd.
 *
 * Pure functie, zodat de classificatie testbaar is zonder browser.
 */
import {
  AUDIT_FILTER_PARAM_ALLOWLIST,
  type AuditEventType,
} from "@/lib/audit/registry";
import { sanitizeAuditFilters } from "@/lib/audit/sanitize";

const SEARCH_KEYS = ["zoeken"] as const;
const PAGINATION_KEYS = ["pagina", "cursor", "richting"] as const;
const SORT_KEYS = ["sortering"] as const;
const VIEW_KEYS = ["view", "weergave"] as const;

export type AuditFilterChange = {
  eventType: Extract<
    AuditEventType,
    | "SEARCH_SUBMITTED"
    | "FILTER_APPLIED"
    | "FILTER_RESET"
    | "SORT_CHANGED"
    | "PAGINATION_CHANGED"
    | "TAB_CHANGED"
  >;
  action: string;
  /** Namen van de veranderde parameters, gesorteerd. */
  changedKeys: string[];
  /** Gesaniteerde filterwaarden van de nieuwe situatie. */
  metadata: Record<string, string | number> | null;
};

function toMap(search: string): Map<string, string> {
  const params = new URLSearchParams(search);
  const map = new Map<string, string>();
  for (const key of new Set(params.keys())) {
    // getAll zodat meervoudige parameters (type=A&type=B) stabiel vergelijken.
    map.set(key, params.getAll(key).slice().sort().join(","));
  }
  return map;
}

function changedKeysBetween(
  previous: Map<string, string>,
  next: Map<string, string>,
): string[] {
  const keys = new Set([...previous.keys(), ...next.keys()]);
  const changed: string[] = [];
  for (const key of keys) {
    if ((previous.get(key) ?? "") !== (next.get(key) ?? "")) changed.push(key);
  }
  return changed.sort();
}

function isSubsetOf(keys: string[], allowed: readonly string[]): boolean {
  return keys.length > 0 && keys.every((key) => allowed.includes(key));
}

/**
 * Retourneert null wanneer er niets relevants veranderde: dezelfde URL, of
 * alleen parameters die geen filter zijn.
 */
export function describeAuditFilterChange(
  previousSearch: string,
  nextSearch: string,
  pathname: string,
): AuditFilterChange | null {
  const previous = toMap(previousSearch);
  const next = toMap(nextSearch);
  const changed = changedKeysBetween(previous, next).filter((key) =>
    (AUDIT_FILTER_PARAM_ALLOWLIST as readonly string[]).includes(key),
  );
  if (changed.length === 0) return null;

  const metadata = sanitizeAuditFilters(
    next.entries(),
    AUDIT_FILTER_PARAM_ALLOWLIST,
  );

  // Volgorde is bewust: specifiek vóór generiek. Alleen wanneer de verandering
  // volledig binnen één groep valt, krijgt die het specifieke event type.
  if (isSubsetOf(changed, PAGINATION_KEYS)) {
    return {
      eventType: "PAGINATION_CHANGED",
      action: `pagination${pathname.replace(/\//g, ".")}`,
      changedKeys: changed,
      metadata,
    };
  }
  if (isSubsetOf(changed, SORT_KEYS)) {
    return {
      eventType: "SORT_CHANGED",
      action: `sort${pathname.replace(/\//g, ".")}`,
      changedKeys: changed,
      metadata,
    };
  }
  if (isSubsetOf(changed, VIEW_KEYS)) {
    return {
      eventType: "TAB_CHANGED",
      action: `view${pathname.replace(/\//g, ".")}`,
      changedKeys: changed,
      metadata,
    };
  }
  if (isSubsetOf(changed, SEARCH_KEYS)) {
    const term = new URLSearchParams(nextSearch).get("zoeken")?.trim() ?? "";
    // Een leeg zoekveld is geen zoekopdracht maar een wisser.
    if (!term) {
      return {
        eventType: "FILTER_RESET",
        action: `filter${pathname.replace(/\//g, ".")}`,
        changedKeys: changed,
        metadata,
      };
    }
    return {
      eventType: "SEARCH_SUBMITTED",
      action: `search${pathname.replace(/\//g, ".")}`,
      changedKeys: changed,
      metadata,
    };
  }

  // Alle filterparameters verdwenen: dat is "Filters wissen".
  const nextFilterKeys = [...next.keys()].filter(
    (key) =>
      (AUDIT_FILTER_PARAM_ALLOWLIST as readonly string[]).includes(key) &&
      !(PAGINATION_KEYS as readonly string[]).includes(key),
  );
  if (nextFilterKeys.length === 0) {
    return {
      eventType: "FILTER_RESET",
      action: `filter${pathname.replace(/\//g, ".")}`,
      changedKeys: changed,
      metadata,
    };
  }

  return {
    eventType: "FILTER_APPLIED",
    action: `filter${pathname.replace(/\//g, ".")}`,
    changedKeys: changed,
    metadata,
  };
}
