import { randomUUID } from "crypto";

/** Interne id's zijn UUID's, door de app gezet (conventie crm.thewebclub.nl). */
export function createId(): string {
  return randomUUID();
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
