/**
 * Centrale sanitizer voor alles wat het audit-log in gaat.
 *
 * Pure functies, geen `server-only`: de client tracker saniteert al vóór het
 * versturen (kleinere payload) en de server saniteert daarna nog een keer.
 * De server is de enige die telt; clientdata wordt nooit vertrouwd.
 *
 * Uitgangspunt: liever te weinig loggen dan één keer te veel. Wat hier niet
 * doorheen komt, staat ook niet in de database.
 */

export const AUDIT_REDACTED = "[verwijderd]";

export const AUDIT_METADATA_LIMITS = {
  /** Diepte van geneste objecten; daaronder wordt afgekapt. */
  maxDepth: 4,
  /** Aantal keys per object. */
  maxKeys: 40,
  /** Aantal elementen per array. */
  maxArrayLength: 20,
  /** Lengte van één string. */
  maxStringLength: 256,
  /** Totale grootte van de JSON in tekens. */
  maxSerializedLength: 4096,
} as const;

/**
 * Keys waarvan de waarde nooit wordt opgeslagen. Match is case-insensitive op
 * substring, zodat `newPassword`, `wachtwoord_herhaal` en `X-Api-Key` allemaal
 * geraakt worden.
 */
const SENSITIVE_KEY_PATTERNS = [
  "password",
  "passwd",
  "wachtwoord",
  "token",
  "secret",
  "credential",
  "authorization",
  "auth-",
  "apikey",
  "api_key",
  "api-key",
  "cookie",
  "session_token",
  "sessiontoken",
  "bearer",
  "signature",
  "private",
  "pin",
  "otp",
  "cvv",
  "cvc",
  "iban",
  "bic",
  "creditcard",
  "credit_card",
  "cardnumber",
  "card_number",
  "bsn",
  "passport",
  "salt",
  "hash",
] as const;

/**
 * Keys die een volledige request- of formulierinhoud bevatten. Die slaan we
 * nooit op, ook niet gesaniteerd: te veel persoonsgegevens, te weinig waarde.
 */
const DROPPED_KEY_PATTERNS = [
  "body",
  "formdata",
  "form_data",
  "rawbody",
  "payload",
  "headers",
  "html",
  "outerhtml",
  "innerhtml",
  "dom",
  "stacktrace",
  "emailbody",
  "email_body",
  "messagebody",
  "attachment",
] as const;

/** Queryparameters waarvan de waarde nooit in een route of url terechtkomt. */
const SENSITIVE_QUERY_KEYS = [
  "token",
  "code",
  "secret",
  "key",
  "password",
  "wachtwoord",
  "signature",
  "access_token",
  "id_token",
  "refresh_token",
  "callbackurl",
  "email",
  "e-mail",
] as const;

function lower(value: string): string {
  return value.toLowerCase();
}

export function isSensitiveAuditKey(key: string): boolean {
  const normalized = lower(key);
  return SENSITIVE_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function isDroppedAuditKey(key: string): boolean {
  const normalized = lower(key);
  return DROPPED_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/**
 * Maakt vrije tekst veilig: controltekens eruit, whitespace samengevoegd,
 * afgekapt op een maximum. Retourneert null als er niets bruikbaars overblijft.
 */
export function sanitizeAuditText(
  value: unknown,
  maxLength: number = AUDIT_METADATA_LIMITS.maxStringLength,
): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

/**
 * Bewaart alleen het pad van een route. De querystring gaat er standaard af:
 * daar staan zoektermen, e-mailadressen en resettokens in. Filterwaarden die we
 * wél willen zien komen via de metadata van een FILTER_APPLIED-event, met een
 * allowlist.
 */
export function sanitizeAuditRoute(
  value: unknown,
  maxLength = 255,
): string | null {
  const text = sanitizeAuditText(value, 2048);
  if (!text) return null;

  // Alleen een echte absolute url door de URL-parser halen. Een pad met een
  // dubbele slash ("//leads//nieuw") zou daar als protocol-relatieve url worden
  // gelezen, waarbij het eerste segment als hostnaam verdwijnt.
  let pathname: string;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
    try {
      pathname = new URL(text).pathname;
    } catch {
      pathname = text.split(/[?#]/)[0] ?? text;
    }
  } else {
    pathname = text.split(/[?#]/)[0] ?? text;
  }

  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  pathname = pathname.replace(/\/{2,}/g, "/");
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "");
  return pathname.slice(0, maxLength) || "/";
}

/**
 * Redigeert gevoelige queryparameters in een url die we wél als geheel willen
 * bewaren (bijvoorbeeld een href van een link).
 */
export function sanitizeAuditHref(
  value: unknown,
  maxLength = 255,
): string | null {
  const text = sanitizeAuditText(value, 2048);
  if (!text) return null;
  if (text.startsWith("mailto:") || text.startsWith("tel:")) {
    // Bevat een persoonsgegeven; alleen het schema is interessant.
    return `${text.split(":")[0]}:${AUDIT_REDACTED}`.slice(0, maxLength);
  }

  try {
    const url = new URL(text, "https://placeholder.invalid");
    for (const key of [...url.searchParams.keys()]) {
      if (
        SENSITIVE_QUERY_KEYS.some((pattern) => lower(key).includes(pattern)) ||
        isSensitiveAuditKey(key)
      ) {
        url.searchParams.set(key, AUDIT_REDACTED);
      }
    }
    const isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(text);
    const rendered = isAbsolute
      ? url.toString()
      : `${url.pathname}${url.search}${url.hash}`;
    return rendered.slice(0, maxLength);
  } catch {
    return text.split("?")[0]?.slice(0, maxLength) ?? null;
  }
}

type SanitizedValue =
  | string
  | number
  | boolean
  | null
  | SanitizedValue[]
  | { [key: string]: SanitizedValue };

function sanitizeValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): SanitizedValue | undefined {
  if (value === null) return null;

  switch (typeof value) {
    case "string":
      return sanitizeAuditText(value) ?? "";
    case "number":
      return Number.isFinite(value) ? value : null;
    case "boolean":
      return value;
    case "bigint":
      return Number.isSafeInteger(Number(value)) ? Number(value) : String(value);
    case "undefined":
    case "function":
    case "symbol":
      return undefined;
    default:
      break;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (depth >= AUDIT_METADATA_LIMITS.maxDepth) return "[te diep]";

  if (typeof value === "object") {
    if (seen.has(value as object)) return "[cyclisch]";
    seen.add(value as object);

    if (Array.isArray(value)) {
      const out: SanitizedValue[] = [];
      for (const item of value.slice(0, AUDIT_METADATA_LIMITS.maxArrayLength)) {
        const sanitized = sanitizeValue(item, depth + 1, seen);
        if (sanitized !== undefined) out.push(sanitized);
      }
      if (value.length > AUDIT_METADATA_LIMITS.maxArrayLength) {
        out.push(`[+${value.length - AUDIT_METADATA_LIMITS.maxArrayLength} meer]`);
      }
      return out;
    }

    const out: Record<string, SanitizedValue> = {};
    let keys = 0;
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (keys >= AUDIT_METADATA_LIMITS.maxKeys) break;
      const safeKey = sanitizeAuditText(key, 64);
      if (!safeKey) continue;
      if (isDroppedAuditKey(safeKey)) continue;
      if (isSensitiveAuditKey(safeKey)) {
        out[safeKey] = AUDIT_REDACTED;
        keys += 1;
        continue;
      }
      const sanitized = sanitizeValue(item, depth + 1, seen);
      if (sanitized === undefined) continue;
      out[safeKey] = sanitized;
      keys += 1;
    }
    return out;
  }

  return undefined;
}

/**
 * Saniteert metadata voor opslag. Retourneert null wanneer er niets overblijft,
 * zodat de kolom leeg blijft in plaats van `{}`.
 */
export function sanitizeAuditMetadata(
  value: unknown,
): Record<string, SanitizedValue> | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    // Alleen objecten; een losse string of array is geen metadata.
    return null;
  }

  const sanitized = sanitizeValue(value, 0, new WeakSet());
  if (
    sanitized == null ||
    typeof sanitized !== "object" ||
    Array.isArray(sanitized)
  ) {
    return null;
  }

  const entries = Object.entries(sanitized);
  if (entries.length === 0) return null;

  // Harde bovengrens op de payload: keys gaan er van achteren af tot het past,
  // zodat één uitschieter niet de hele rij opblaast.
  //
  // De vlag `_afgekapt` wordt per ronde opnieuw op een kopie gezet en nooit op
  // de lijst die wordt ingekort. Zou hij in de te-korten lijst staan, dan is hij
  // zelf de laatste key: die wordt dan verwijderd en direct weer toegevoegd,
  // waardoor de lengte nooit daalt en de lus niet eindigt.
  let kept = entries;
  let truncated = false;

  while (kept.length > 0) {
    const candidate: Record<string, SanitizedValue> = Object.fromEntries(kept);
    if (truncated) candidate._afgekapt = true;
    if (
      JSON.stringify(candidate).length <=
      AUDIT_METADATA_LIMITS.maxSerializedLength
    ) {
      return candidate;
    }
    kept = kept.slice(0, -1);
    truncated = true;
  }

  // Zelfs één key paste niet; alleen de vlag blijft over.
  return { _afgekapt: true };
}

/**
 * Filterwaarden voor een FILTER_APPLIED- of SEARCH_SUBMITTED-event.
 *
 * Alleen keys uit de allowlist, waarden afgekapt. Een zoekterm wordt bewust
 * niet volledig opgeslagen: lengte en of er iets getypt is, is genoeg om
 * gebruik te kunnen analyseren zonder de inhoud te bewaren.
 */
export function sanitizeAuditFilters(
  params: Iterable<[string, string]>,
  allowedKeys: readonly string[],
  redactedKeys: readonly string[] = ["zoeken"],
): Record<string, string | number> | null {
  const out: Record<string, string | number> = {};
  let count = 0;
  for (const [key, value] of params) {
    if (count >= AUDIT_METADATA_LIMITS.maxKeys) break;
    const safeKey = sanitizeAuditText(key, 48);
    if (!safeKey) continue;
    if (!allowedKeys.includes(safeKey)) continue;
    if (redactedKeys.includes(safeKey)) {
      const length = value.trim().length;
      if (length === 0) continue;
      out[`${safeKey}_lengte`] = length;
      count += 1;
      continue;
    }
    const safeValue = sanitizeAuditText(value, 64);
    if (!safeValue) continue;
    out[safeKey] = safeValue;
    count += 1;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Zoekveld voor de logpagina. Lowercase concatenatie van de velden waarop de
 * UI mag zoeken, zodat één LIKE genoeg is in plaats van vier OR's.
 */
export function buildAuditSearchIndex(
  parts: Array<string | null | undefined>,
): string | null {
  const joined = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .toLowerCase();
  const cleaned = sanitizeAuditText(joined, 1024);
  return cleaned;
}
