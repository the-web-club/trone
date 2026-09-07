/** ISO 3166-1 alpha-2 van EU-lidstaten, plus VIES-codes EL (Griekenland) en XI (Noord-Ierland). */
export const EU_COUNTRY_CODES = [
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "EL",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
  "XI",
] as const;

export type EuCountryCode = (typeof EU_COUNTRY_CODES)[number];

const EU_COUNTRY_SET = new Set<string>(EU_COUNTRY_CODES);

/** VIES gebruikt EL voor Griekenland, ISO gebruikt GR. */
export const VIES_COUNTRY_CODE_BY_ISO: Record<string, string> = {
  GR: "EL",
};

export function normalizeCountryCode(
  country: string | null | undefined,
): string {
  return (country ?? "").trim().toUpperCase();
}

export function isEuCountry(country: string | null | undefined): boolean {
  return EU_COUNTRY_SET.has(normalizeCountryCode(country));
}

export function isNetherlands(country: string | null | undefined): boolean {
  return normalizeCountryCode(country) === "NL";
}

export function toViesCountryCode(country: string | null | undefined): string {
  const code = normalizeCountryCode(country);
  return VIES_COUNTRY_CODE_BY_ISO[code] ?? code;
}
