export type Letterhead = {
  name: string;
  addressLine: string;
  postalCode: string;
  city: string;
  country: string;
  cocNumber: string;
  vatNumber: string;
  iban: string;
  phone: string;
  email: string;
  website: string;
};

export const EMPTY_LETTERHEAD: Letterhead = {
  name: "",
  addressLine: "",
  postalCode: "",
  city: "",
  country: "",
  cocNumber: "",
  vatNumber: "",
  iban: "",
  phone: "",
  email: "",
  website: "",
};

function trim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function letterheadFromUnknown(value: unknown): Letterhead {
  const row =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    name: trim(row.name),
    addressLine: trim(row.addressLine),
    postalCode: trim(row.postalCode),
    city: trim(row.city),
    country: trim(row.country),
    cocNumber: trim(row.cocNumber),
    vatNumber: trim(row.vatNumber),
    iban: trim(row.iban),
    phone: trim(row.phone),
    email: trim(row.email),
    website: trim(row.website),
  };
}

export function parseLetterheadJson(raw: string | null | undefined): Letterhead {
  if (!raw?.trim()) return { ...EMPTY_LETTERHEAD };
  try {
    return letterheadFromUnknown(JSON.parse(raw));
  } catch {
    return { ...EMPTY_LETTERHEAD };
  }
}

function compact(values: Array<string | null | undefined>): string[] {
  return values.map((value) => value?.trim() ?? "").filter(Boolean);
}

export function letterheadAddressLines(letterhead: Letterhead): string[] {
  const cityLine = compact([letterhead.postalCode, letterhead.city]).join(" ");
  return compact([letterhead.addressLine, cityLine || null, letterhead.country]);
}

export function letterheadContactLines(letterhead: Letterhead): string[] {
  return compact([letterhead.phone, letterhead.email, letterhead.website]);
}

export function letterheadLegalParts(letterhead: Letterhead): string[] {
  return compact([
    letterhead.cocNumber ? `KvK ${letterhead.cocNumber}` : null,
    letterhead.vatNumber ? `Btw ${letterhead.vatNumber}` : null,
    letterhead.iban ? `IBAN ${letterhead.iban}` : null,
  ]);
}
