import {
  isEuCountry,
  isNetherlands,
  normalizeCountryCode,
} from "@/lib/eu-countries";

export const DEFAULT_VAT_RATE = 21;
export const ZERO_VAT_RATE = 0;
export const VIES_CACHE_MAX_AGE_DAYS = 90;
export const VIES_CACHE_MAX_AGE_MS = VIES_CACHE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

export const VAT_REGIMES = ["BINNENLANDS", "VERLEGD", "EXPORT"] as const;
export type VatRegime = (typeof VAT_REGIMES)[number];

export type ViesStatus = "GELDIG" | "ONGELDIG" | "ONBEKEND";

export const VAT_WARNINGS = {
  EU_INVALID:
    "Verlegging (0%) is niet toegestaan zonder geldig VIES-nummer. Er is 21% btw toegepast.",
  EU_UNKNOWN:
    "VIES-status onbekend of niet gevalideerd. Verlegging is niet toegepast; er is 21% btw toegepast als veilige default.",
  ZERO_WITHOUT_VIES:
    "0% btw wordt toegepast zonder geldige VIES-validatie. Controleer of dit klopt.",
  STALE_CACHE:
    "VIES-validatie ontbreekt of is ouder dan 90 dagen. Bij opslaan of versturen wordt opnieuw gecontroleerd.",
} as const;

export const VAT_REGIME_LABELS: Record<VatRegime, string> = {
  BINNENLANDS: "Binnenlands",
  VERLEGD: "Verlegd (reverse charge)",
  EXPORT: "Export / 0% btw",
};

export const VAT_REGIME_MENTIONS: Record<VatRegime, string | null> = {
  BINNENLANDS: null,
  VERLEGD: "Btw verlegd / reverse charge",
  EXPORT: "Export / 0% btw",
};

export type VatTreatment = {
  vatRate: number;
  vatRegime: VatRegime;
  warning: string | null;
  mention: string | null;
};

export type FrozenVat = {
  vatRate: number;
  vatRegime: VatRegime;
  vatNotice: string | null;
};

/**
 * Bepaalt btw-tarief en -regime op klantland + VIES-status.
 * 0% volgt alleen uit de beslisboom (verlegd of export); bij twijfel 21%.
 */
export function resolveVatTreatment(
  country: string | null | undefined,
  viesStatus: ViesStatus,
): VatTreatment {
  const code = normalizeCountryCode(country) || "NL";

  if (isNetherlands(code)) {
    return {
      vatRate: DEFAULT_VAT_RATE,
      vatRegime: "BINNENLANDS",
      warning: null,
      mention: VAT_REGIME_MENTIONS.BINNENLANDS,
    };
  }

  if (!isEuCountry(code)) {
    return {
      vatRate: ZERO_VAT_RATE,
      vatRegime: "EXPORT",
      warning: null,
      mention: VAT_REGIME_MENTIONS.EXPORT,
    };
  }

  if (viesStatus === "GELDIG") {
    return {
      vatRate: ZERO_VAT_RATE,
      vatRegime: "VERLEGD",
      warning: null,
      mention: VAT_REGIME_MENTIONS.VERLEGD,
    };
  }

  return {
    vatRate: DEFAULT_VAT_RATE,
    vatRegime: "BINNENLANDS",
    warning:
      viesStatus === "ONGELDIG"
        ? VAT_WARNINGS.EU_INVALID
        : VAT_WARNINGS.EU_UNKNOWN,
    mention: VAT_REGIME_MENTIONS.BINNENLANDS,
  };
}

export function frozenVatFromTreatment(treatment: VatTreatment): FrozenVat {
  return {
    vatRate: treatment.vatRate,
    vatRegime: treatment.vatRegime,
    vatNotice: treatment.warning,
  };
}

export function isViesCacheFresh(
  validatedAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!validatedAt) return false;
  const at =
    validatedAt instanceof Date ? validatedAt : new Date(validatedAt);
  if (Number.isNaN(at.getTime())) return false;
  return now.getTime() - at.getTime() < VIES_CACHE_MAX_AGE_MS;
}

export function shouldRefreshVies(input: {
  country: string | null | undefined;
  vatNumber?: string | null;
  viesValidatedAt?: Date | string | null;
  force?: boolean;
}): boolean {
  if (input.force) return true;
  if (!isEuCountry(input.country) || isNetherlands(input.country)) return false;
  if (!input.vatNumber?.trim()) return false;
  return !isViesCacheFresh(input.viesValidatedAt);
}

export function viesStatusFromCache(input: {
  country: string | null | undefined;
  vatNumber?: string | null;
  viesValid?: boolean | null;
  viesValidatedAt?: Date | string | null;
  now?: Date;
}): { status: ViesStatus; stale: boolean } {
  const stale = shouldRefreshVies({
    country: input.country,
    vatNumber: input.vatNumber,
    viesValidatedAt: input.viesValidatedAt,
  });

  if (!isEuCountry(input.country) || isNetherlands(input.country)) {
    return { status: "ONBEKEND", stale: false };
  }

  if (stale || input.viesValid == null) {
    return { status: "ONBEKEND", stale };
  }

  return {
    status: input.viesValid ? "GELDIG" : "ONGELDIG",
    stale: false,
  };
}

export function zeroRateWithoutValidVies(input: {
  vatRate: number;
  vatRegime: VatRegime | null | undefined;
}): boolean {
  return input.vatRate === 0 && input.vatRegime !== "VERLEGD" && input.vatRegime !== "EXPORT";
}
