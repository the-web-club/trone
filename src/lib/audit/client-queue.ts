/**
 * Client-side wachtrij voor audit-events.
 *
 * Losgekoppeld van de DOM en van `fetch`, zodat het gedrag dat écht risico
 * oplevert — batchgrootte, retries, drops, dedup — te testen is zonder browser.
 *
 * Regels:
 *   - `enqueue()` is synchroon en doet nooit netwerk. Een klik of navigatie
 *     wacht dus nooit op logging.
 *   - Er wordt gebatcht op tijd én op aantal, met een harde bovengrens.
 *   - Eén retry per batch, daarna wordt de batch weggegooid. Oneindig
 *     doorproberen zou bij een storing de app opvreten.
 *   - Bij overloop worden de oudste events gedropt en wordt dat geteld, zodat
 *     de logpagina niet stil incompleet raakt.
 *   - Elk event houdt zijn `clientEventId` vast over retries heen; de server
 *     dedupliceert daarop.
 */
import type { AuditClientEventPayload } from "@/lib/audit/types";

export const AUDIT_QUEUE_DEFAULTS = {
  /** Maximale batchgrootte; de server weigert meer. */
  maxBatch: 25,
  /** Wachttijd voordat een niet-volle batch wordt verstuurd. */
  flushIntervalMs: 4000,
  /** Bovengrens voor de wachtrij; daarboven worden de oudste events gedropt. */
  maxQueue: 200,
  /** Aantal extra pogingen per batch. */
  maxRetries: 1,
  /** Wachttijd voor de retry. */
  retryDelayMs: 2000,
} as const;

export type AuditQueueSender = (
  events: AuditClientEventPayload[],
  options: { final: boolean },
) => Promise<boolean> | boolean;

export type AuditQueueOptions = {
  send: AuditQueueSender;
  maxBatch?: number;
  flushIntervalMs?: number;
  maxQueue?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

export type AuditQueueStats = {
  queued: number;
  dropped: number;
  sent: number;
  failed: number;
};

export type AuditQueue = {
  enqueue: (event: AuditClientEventPayload) => void;
  /** `final` gebruikt sendBeacon-achtig gedrag: geen retry, alles in één keer. */
  flush: (options?: { final?: boolean }) => Promise<void>;
  stats: () => AuditQueueStats;
  size: () => number;
  dispose: () => void;
};

export function createAuditQueue(options: AuditQueueOptions): AuditQueue {
  const maxBatch = options.maxBatch ?? AUDIT_QUEUE_DEFAULTS.maxBatch;
  const flushIntervalMs =
    options.flushIntervalMs ?? AUDIT_QUEUE_DEFAULTS.flushIntervalMs;
  const maxQueue = options.maxQueue ?? AUDIT_QUEUE_DEFAULTS.maxQueue;
  const maxRetries = options.maxRetries ?? AUDIT_QUEUE_DEFAULTS.maxRetries;
  const retryDelayMs =
    options.retryDelayMs ?? AUDIT_QUEUE_DEFAULTS.retryDelayMs;
  const setTimer =
    options.setTimer ??
    ((callback: () => void, ms: number) => setTimeout(callback, ms));
  const clearTimer =
    options.clearTimer ??
    ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  let queue: AuditClientEventPayload[] = [];
  let timer: unknown = null;
  let inFlight: Promise<void> | null = null;
  let disposed = false;
  const stats: AuditQueueStats = { queued: 0, dropped: 0, sent: 0, failed: 0 };

  function stopTimer() {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  }

  function scheduleFlush() {
    if (disposed || timer !== null) return;
    timer = setTimer(() => {
      timer = null;
      void flush();
    }, flushIntervalMs);
  }

  function enqueue(event: AuditClientEventPayload) {
    if (disposed) return;
    queue.push(event);
    stats.queued += 1;

    if (queue.length > maxQueue) {
      // Oudste eruit: een verse klik is bruikbaarder dan een klik van een
      // minuut terug die al niet verstuurd kreeg worden.
      const overflow = queue.length - maxQueue;
      queue.splice(0, overflow);
      stats.dropped += overflow;
    }

    if (queue.length >= maxBatch) {
      void flush();
      return;
    }
    scheduleFlush();
  }

  async function sendBatch(
    batch: AuditClientEventPayload[],
    final: boolean,
  ): Promise<void> {
    let attempt = 0;
    // Bij het verlaten van de pagina is er geen tijd voor een retry.
    const attempts = final ? 1 : maxRetries + 1;

    while (attempt < attempts) {
      attempt += 1;
      let ok = false;
      try {
        ok = await options.send(batch, { final });
      } catch {
        ok = false;
      }
      if (ok) {
        stats.sent += batch.length;
        return;
      }
      if (attempt < attempts) {
        await new Promise<void>((resolve) => {
          setTimer(() => resolve(), retryDelayMs);
        });
      }
    }

    // Opgegeven. Niet terugzetten in de wachtrij: dan blijft een kapotte
    // endpoint eindeloos dezelfde batch opnieuw proberen.
    stats.failed += batch.length;
  }

  async function flush(flushOptions: { final?: boolean } = {}): Promise<void> {
    const final = flushOptions.final ?? false;
    stopTimer();

    if (inFlight && !final) {
      // Al een batch onderweg; die pakt de rest in de volgende ronde mee.
      await inFlight;
      if (queue.length === 0) return;
    }

    const run = (async () => {
      while (queue.length > 0) {
        const batch = queue.splice(0, maxBatch);
        await sendBatch(batch, final);
        if (final) continue;
      }
    })();

    inFlight = run;
    try {
      await run;
    } finally {
      if (inFlight === run) inFlight = null;
    }
  }

  return {
    enqueue,
    flush,
    stats: () => ({ ...stats }),
    size: () => queue.length,
    dispose: () => {
      disposed = true;
      stopTimer();
      queue = [];
    },
  };
}
