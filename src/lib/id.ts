import { randomUUID } from "crypto";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Interne id's zijn UUID's, door de app gezet (conventie crm.thewebclub.nl). */
export function createId(): string {
  return randomUUID();
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function whereIdOrSlug(value: string): { id: string } | { slug: string } {
  return isUuid(value) ? { id: value } : { slug: value };
}

export function whereIdOrQuoteNumber(
  value: string,
): { id: string } | { quoteNumber: string } {
  return isUuid(value) ? { id: value } : { quoteNumber: value };
}

export function whereIdOrOrderNumber(
  value: string,
): { id: string } | { orderNumber: string } {
  return isUuid(value) ? { id: value } : { orderNumber: value };
}

/** Publieke korte code (bv voor offerte-referenties): 8 tekens [a-z0-9]. */
export function createShortCode(length = 8): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
