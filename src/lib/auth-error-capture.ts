import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import type { BetterAuthOptions } from "better-auth";

/**
 * Vangnet voor de fout die Better Auth weggooit.
 *
 * De `getSession`-handler van Better Auth heeft een catch-all die elke
 * onverwachte fout — in de praktijk een databasefout — vervangt door
 * `APIError: Failed to get session`. De oorspronkelijke fout gaat daarbij niet
 * als `cause` mee (`APIError.from` zet alleen `message` en `code`); hij wordt
 * uitsluitend nog naar de logger geschreven en verdwijnt daarna. Het gevolg is
 * een serverfout in het audit-log die wél meldt dat de sessie niet gelezen kon
 * worden, maar niet waaróm.
 *
 * Deze module maakt van die logger-aanroep een waarde die de aanroeper kan
 * uitlezen.
 *
 * AsyncLocalStorage en geen module-variabele: op één serverless isolate lopen
 * meerdere requests door elkaar, en dan zou de ene request de fout van de
 * andere claimen.
 */

/** Plek waar de logger de onderliggende fout in achterlaat. */
export type AuthErrorSlot = { error: unknown };

const slotStorage = new AsyncLocalStorage<AuthErrorSlot>();

export function createAuthErrorSlot(): AuthErrorSlot {
  return { error: null };
}

/**
 * Voert een Better Auth-aanroep uit met een actief slot. Alles wat de logger
 * tijdens `fn` als fout meldt, komt in `slot` terecht.
 */
export function runWithAuthErrorSlot<T>(
  slot: AuthErrorSlot,
  fn: () => Promise<T>,
): Promise<T> {
  return slotStorage.run(slot, fn);
}

/**
 * Logger voor Better Auth.
 *
 * Schrijft alles door naar de serverconsole zoals de standaardlogger dat doet,
 * en legt daarnaast de eerste fout vast in het actieve slot. De eerste en niet
 * de laatste: de catch-all logt de oorzaak vóór hij de vervangende APIError
 * gooit, dus wat daarna nog langskomt is gevolg en geen oorzaak.
 */
export const authLogger: BetterAuthOptions["logger"] = {
  disableColors: true,
  log(level, message, ...args) {
    if (level === "error") {
      const slot = slotStorage.getStore();
      if (slot && slot.error == null) {
        slot.error = args.find((arg) => arg instanceof Error) ?? message;
      }
    }

    const line = `[Better Auth] ${message}`;
    if (level === "error") console.error(line, ...args);
    else if (level === "warn") console.warn(line, ...args);
    else console.log(line, ...args);
  },
};
