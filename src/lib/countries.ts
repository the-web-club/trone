/** ISO 3166-1 alpha-2, plus XK (Kosovo). */
const ISO_COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU",
  "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL",
  "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC",
  "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV",
  "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG",
  "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD",
  "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT",
  "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM",
  "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH",
  "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK",
  "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH",
  "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW",
  "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR",
  "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR",
  "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC",
  "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL",
  "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY",
  "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "XK", "YE", "YT",
  "ZA", "ZM", "ZW",
] as const;

const ISO_COUNTRY_SET = new Set<string>(ISO_COUNTRY_CODES);

/** Gangbare aliassen → ISO 3166-1 alpha-2. */
export const COUNTRY_ALIASES: Record<string, string> = {
  UK: "GB",
  EL: "GR",
};

let cachedNames: Intl.DisplayNames | null = null;

function regionNames() {
  cachedNames ??= new Intl.DisplayNames(["nl"], { type: "region" });
  return cachedNames;
}

export function isoCountryCodes(): string[] {
  return [...ISO_COUNTRY_CODES];
}

export function normalizeCountryCode(
  country: string | null | undefined,
): string {
  const raw = (country ?? "").trim().toUpperCase();
  if (!raw) return "";
  return COUNTRY_ALIASES[raw] ?? raw;
}

export function countryLabel(code: string): string {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return code;
  try {
    return regionNames().of(normalized) ?? normalized;
  } catch {
    return normalized;
  }
}

export type CountryOption = {
  value: string;
  label: string;
  hint: string;
};

export function countrySelectOptions(): CountryOption[] {
  return ISO_COUNTRY_CODES.map((value) => ({
    value,
    label: countryLabel(value),
    hint: value,
  })).sort((a, b) => a.label.localeCompare(b.label, "nl"));
}

export function isIsoCountryCode(code: string | null | undefined): boolean {
  const normalized = normalizeCountryCode(code);
  return ISO_COUNTRY_SET.has(normalized);
}
