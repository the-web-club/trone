/**
 * Bepaalt wat er is aangeklikt, voor de centrale klik-listener.
 *
 * Werkt tegen een structureel type in plaats van `HTMLElement`, zodat deze
 * logica in de node-testomgeving van dit project te testen is zonder jsdom.
 * Een echt `Element` past op `AuditClickElement`.
 *
 * Wat hier NIET uit komt: HTML, DOM-structuur of onbegrensde tekst. Alleen een
 * korte beschrijving van het doel.
 */
import { sanitizeAuditHref, sanitizeAuditText } from "@/lib/audit/sanitize";

export type AuditClickElement = {
  tagName: string;
  getAttribute(name: string): string | null;
  /** Zichtbare tekst; wordt afgekapt en genormaliseerd. */
  readonly textContent: string | null;
  readonly parentElement: AuditClickElement | null;
};

export type AuditClickDescriptor = {
  /** button, link, tab, menuitem, nav-item, ... */
  targetType: string;
  /** data-audit-target, data-testid, id, of een afgeleide sleutel. */
  targetKey: string | null;
  /** Kort, gesaniteerd label. */
  targetLabel: string | null;
  /** Alleen voor links, met gevoelige queryparameters geredigeerd. */
  href: string | null;
  /** data-audit-component, als de component die zet. */
  component: string | null;
  /** data-audit-action, als de component een specifieke actie meegeeft. */
  action: string | null;
};

/** Hoe ver we vanaf het klikdoel omhoog zoeken naar een interactief element. */
const MAX_ANCESTOR_DEPTH = 8;

const MAX_LABEL_LENGTH = 80;
const MAX_KEY_LENGTH = 120;

const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "tab",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "switch",
  "checkbox",
  "radio",
  "combobox",
]);

const INTERACTIVE_TAGS = new Set([
  "BUTTON",
  "A",
  "SUMMARY",
  "SELECT",
  "LABEL",
]);

function attr(element: AuditClickElement, name: string): string | null {
  try {
    return element.getAttribute(name);
  } catch {
    return null;
  }
}

function tag(element: AuditClickElement): string {
  return (element.tagName || "").toUpperCase();
}

/** Wordt er op deze knoop bewust niet gelogd? */
function isIgnored(element: AuditClickElement): boolean {
  return attr(element, "data-audit-ignore") !== null;
}

function isInteractive(element: AuditClickElement): boolean {
  if (attr(element, "data-audit-action") !== null) return true;
  if (attr(element, "data-audit-target") !== null) return true;

  const name = tag(element);
  if (INTERACTIVE_TAGS.has(name)) return true;

  if (name === "INPUT") {
    const type = (attr(element, "type") ?? "text").toLowerCase();
    return ["button", "submit", "reset", "checkbox", "radio", "file"].includes(
      type,
    );
  }

  const role = attr(element, "role");
  if (role && INTERACTIVE_ROLES.has(role.toLowerCase())) return true;

  // Interactieve kaarten en rijen: die hebben geen rol, maar wel een
  // tabindex of een expliciet interactive-attribuut uit responsive-list.
  if (attr(element, "data-interactive") !== null) return true;
  const tabIndex = attr(element, "tabindex");
  if (tabIndex !== null && Number(tabIndex) >= 0 && attr(element, "onclick")) {
    return true;
  }

  return false;
}

function resolveTargetType(element: AuditClickElement): string {
  const explicit = attr(element, "data-audit-type");
  if (explicit) return sanitizeAuditText(explicit, 32) ?? "element";

  const role = attr(element, "role")?.toLowerCase();
  if (role && INTERACTIVE_ROLES.has(role)) return role;

  const name = tag(element);
  if (name === "A") return "link";
  if (name === "BUTTON") return "button";
  if (name === "SUMMARY") return "disclosure";
  if (name === "SELECT") return "select";
  if (name === "LABEL") return "label";
  if (name === "INPUT") {
    return `input-${(attr(element, "type") ?? "text").toLowerCase()}`;
  }
  return name.toLowerCase() || "element";
}

/**
 * Label-fallback, in volgorde van betrouwbaarheid. Zichtbare tekst komt als
 * laatste omdat die het vaakst persoonsgegevens bevat (een contactnaam in een
 * lijstlink); daarom ook de harde afkap op MAX_LABEL_LENGTH.
 */
function resolveLabel(element: AuditClickElement): string | null {
  const candidates = [
    attr(element, "data-audit-label"),
    attr(element, "aria-label"),
    attr(element, "title"),
    attr(element, "alt"),
    attr(element, "value"),
    element.textContent,
  ];
  for (const candidate of candidates) {
    const cleaned = sanitizeAuditText(candidate, MAX_LABEL_LENGTH);
    if (cleaned) return cleaned;
  }
  return null;
}

/**
 * Sleutel om op te kunnen filteren en aggregeren. Een expliciete
 * `data-audit-target` is het beste; daarna een testid, een naam of een id.
 * Als laatste redmiddel het pad van een link, want dat is stabiel.
 */
function resolveKey(element: AuditClickElement): string | null {
  const candidates = [
    attr(element, "data-audit-target"),
    attr(element, "data-testid"),
    attr(element, "name"),
    attr(element, "id"),
  ];
  for (const candidate of candidates) {
    const cleaned = sanitizeAuditText(candidate, MAX_KEY_LENGTH);
    if (cleaned) return cleaned;
  }
  const href = attr(element, "href");
  if (href) {
    const path = sanitizeAuditHref(href, MAX_KEY_LENGTH);
    if (path) return path;
  }
  return null;
}

/** Zoekt vanaf het klikdoel omhoog naar de component die het label draagt. */
function resolveComponent(element: AuditClickElement): string | null {
  let current: AuditClickElement | null = element;
  for (let depth = 0; current && depth < MAX_ANCESTOR_DEPTH; depth += 1) {
    const value = attr(current, "data-audit-component");
    const cleaned = sanitizeAuditText(value, 64);
    if (cleaned) return cleaned;
    current = current.parentElement;
  }
  return null;
}

/**
 * Beschrijft de klik, of null wanneer er niets interactiefs geraakt is of een
 * voorouder `data-audit-ignore` heeft staan.
 */
export function describeAuditClick(
  element: AuditClickElement | null,
): AuditClickDescriptor | null {
  let current: AuditClickElement | null = element;
  let interactive: AuditClickElement | null = null;

  for (let depth = 0; current && depth < MAX_ANCESTOR_DEPTH; depth += 1) {
    // Ignore heeft altijd voorrang, ook als er onderweg al iets interactiefs
    // gevonden is: een expliciet uitgesloten blok logt niets.
    if (isIgnored(current)) return null;
    if (!interactive && isInteractive(current)) interactive = current;
    current = current.parentElement;
  }

  if (!interactive) return null;

  const hrefAttr = attr(interactive, "href");
  return {
    targetType: resolveTargetType(interactive),
    targetKey: resolveKey(interactive),
    targetLabel: resolveLabel(interactive),
    href: hrefAttr ? sanitizeAuditHref(hrefAttr, 191) : null,
    component: resolveComponent(interactive),
    action: sanitizeAuditText(attr(interactive, "data-audit-action"), 96),
  };
}
