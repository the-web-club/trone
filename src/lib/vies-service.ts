import {
  isEuCountry,
  normalizeCountryCode,
  toViesCountryCode,
} from "@/lib/eu-countries";
import type { ViesStatus } from "@/lib/vat";

export const VIES_CHECK_URL =
  "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";
export const VIES_DEFAULT_TIMEOUT_MS = 8000;

const VIES_UNAVAILABLE_ERRORS = new Set([
  "MS_UNAVAILABLE",
  "MS_MAX_CONCURRENT_REQ",
  "MS_MAX_CONCURRENT_REQ_TIME",
  "GLOBAL_MAX_CONCURRENT_REQ",
  "GLOBAL_MAX_CONCURRENT_REQ_TIME",
  "TIMEOUT",
  "SERVICE_UNAVAILABLE",
  "VAT_BLOCKED",
  "IP_BLOCKED",
]);

const VAT_COUNTRY_PREFIXES = new Set([
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
  "GB",
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
  "NO",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
  "CH",
  "UK",
  "XI",
]);

export type ParsedVatNumber = {
  countryCode: string;
  vatNumber: string;
};

export type ViesCheckResult = {
  status: ViesStatus;
  countryCode: string | null;
  vatNumber: string | null;
  name: string | null;
  checkedAt: string;
  error: string | null;
};

export type ViesFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function unknownResult(
  partial: Partial<ViesCheckResult> & { error: string },
): ViesCheckResult {
  return {
    status: "ONBEKEND",
    countryCode: partial.countryCode ?? null,
    vatNumber: partial.vatNumber ?? null,
    name: null,
    checkedAt: new Date().toISOString(),
    error: partial.error,
  };
}

export function parseVatNumber(
  raw: string | null | undefined,
  fallbackCountry?: string | null,
): ParsedVatNumber | null {
  const normalized = (raw ?? "").replace(/[\s.\-]/g, "").toUpperCase();
  if (!normalized) return null;

  const prefix = normalized.slice(0, 2);
  const rest = normalized.slice(2);
  if (VAT_COUNTRY_PREFIXES.has(prefix) && rest.length > 0) {
    return {
      countryCode: toViesCountryCode(prefix),
      vatNumber: rest,
    };
  }

  const fallback = normalizeCountryCode(fallbackCountry);
  if (!fallback) return null;
  const viesCountry = toViesCountryCode(fallback);
  const stripped = normalized.startsWith(viesCountry)
    ? normalized.slice(viesCountry.length)
    : normalized.startsWith(fallback)
      ? normalized.slice(fallback.length)
      : normalized;
  if (!stripped) return null;
  return { countryCode: viesCountry, vatNumber: stripped };
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "---") return null;
  return trimmed;
}

function collectErrorCodes(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const record = body as Record<string, unknown>;
  const codes: string[] = [];
  if (typeof record.userError === "string") codes.push(record.userError);
  if (typeof record.error === "string") codes.push(record.error);
  if (Array.isArray(record.errorWrappers)) {
    for (const wrapper of record.errorWrappers) {
      if (wrapper && typeof wrapper === "object" && "error" in wrapper) {
        const error = (wrapper as { error?: unknown }).error;
        if (typeof error === "string") codes.push(error);
      }
    }
  }
  return codes.map((code) => code.trim().toUpperCase()).filter(Boolean);
}

export function interpretViesResponse(input: {
  ok: boolean;
  status: number;
  body: unknown;
  countryCode: string;
  vatNumber: string;
}): ViesCheckResult {
  const checkedAt = new Date().toISOString();
  const base = {
    countryCode: input.countryCode,
    vatNumber: input.vatNumber,
    checkedAt,
  };

  if (!input.ok && input.status >= 500) {
    return unknownResult({
      ...base,
      error: `VIES gaf HTTP ${input.status}.`,
    });
  }

  const codes = collectErrorCodes(input.body);
  if (codes.some((code) => VIES_UNAVAILABLE_ERRORS.has(code))) {
    return unknownResult({
      ...base,
      error: codes[0] ?? "VIES onbereikbaar.",
    });
  }

  if (!input.body || typeof input.body !== "object") {
    if (!input.ok) {
      return unknownResult({
        ...base,
        error: `VIES gaf HTTP ${input.status}.`,
      });
    }
    return unknownResult({ ...base, error: "Ongeldig VIES-antwoord." });
  }

  const record = input.body as Record<string, unknown>;
  const valid =
    record.valid === true ||
    record.isValid === true ||
    (record.valid === false || record.isValid === false
      ? false
      : null);

  if (valid === true) {
    return {
      status: "GELDIG",
      countryCode: input.countryCode,
      vatNumber: input.vatNumber,
      name: readString(record.name) ?? readString(record.traderName),
      checkedAt,
      error: null,
    };
  }

  if (valid === false || codes.includes("INVALID_INPUT")) {
    return {
      status: "ONGELDIG",
      countryCode: input.countryCode,
      vatNumber: input.vatNumber,
      name: readString(record.name) ?? readString(record.traderName),
      checkedAt,
      error: null,
    };
  }

  if (!input.ok) {
    return unknownResult({
      ...base,
      error: `VIES gaf HTTP ${input.status}.`,
    });
  }

  return unknownResult({ ...base, error: "VIES-status onbekend." });
}

export async function checkViesVatNumber(
  rawVatNumber: string | null | undefined,
  options?: {
    fallbackCountry?: string | null;
    fetch?: ViesFetch;
    timeoutMs?: number;
  },
): Promise<ViesCheckResult> {
  const parsed = parseVatNumber(rawVatNumber, options?.fallbackCountry);
  if (!parsed) {
    return unknownResult({ error: "Geen btw-nummer om te valideren." });
  }

  if (!isEuCountry(parsed.countryCode)) {
    return unknownResult({
      countryCode: parsed.countryCode,
      vatNumber: parsed.vatNumber,
      error: "VIES geldt alleen voor EU-landen.",
    });
  }

  const timeoutMs = options?.timeoutMs ?? VIES_DEFAULT_TIMEOUT_MS;
  const fetchFn = options?.fetch ?? fetch;
  const controller = new AbortController();

  try {
    const response = await new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => {
        controller.abort();
        const timeoutError = new Error("VIES-timeout.");
        timeoutError.name = "AbortError";
        reject(timeoutError);
      }, timeoutMs);

      Promise.resolve(
        fetchFn(VIES_CHECK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            countryCode: parsed.countryCode,
            vatNumber: parsed.vatNumber,
          }),
          signal: controller.signal,
        }),
      ).then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    return interpretViesResponse({
      ok: response.ok,
      status: response.status,
      body,
      countryCode: parsed.countryCode,
      vatNumber: parsed.vatNumber,
    });
  } catch (error) {
    const aborted =
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError");
    return unknownResult({
      countryCode: parsed.countryCode,
      vatNumber: parsed.vatNumber,
      error: aborted ? "VIES-timeout." : "VIES onbereikbaar.",
    });
  }
}
