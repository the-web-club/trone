import "server-only";

import { getCompanyFilterFacets } from "@/lib/company-service";
import { getContactFilterFacets } from "@/lib/contact-service";
import { getDealFilterFacets } from "@/lib/deal-service";
import { getOrderFilterFacets } from "@/lib/order-service";
import { getQuoteFilterFacets } from "@/lib/quote-service";
import { liveFilterIndexMeta } from "@/lib/filters/result";

export type FilterRebuildResult = {
  index: ReturnType<typeof liveFilterIndexMeta>;
  timingsMs: Record<string, number>;
  totals: Record<string, number>;
};

async function timed<T>(label: string, run: () => Promise<T>) {
  const started = performance.now();
  const value = await run();
  return { label, ms: Math.round(performance.now() - started), value };
}

/**
 * Live facet counts hebben geen denormalized tabel om te vullen.
 * Deze rebuild is een idempotente health-check: dezelfde predicaten als
 * de lijsten, gebundeld, zonder N+1.
 */
export async function rebuildFilterFacets(
  currentUserId?: string,
): Promise<FilterRebuildResult> {
  const [leads, companies, contacts, quotes, orders] = await Promise.all([
    timed("lead", () => getDealFilterFacets({}, currentUserId)),
    timed("company", () => getCompanyFilterFacets({}, currentUserId)),
    timed("contact", () => getContactFilterFacets({}, currentUserId)),
    timed("quote", () => getQuoteFilterFacets({})),
    timed("order", () => getOrderFilterFacets({})),
  ]);

  return {
    index: liveFilterIndexMeta(),
    timingsMs: {
      [leads.label]: leads.ms,
      [companies.label]: companies.ms,
      [contacts.label]: contacts.ms,
      [quotes.label]: quotes.ms,
      [orders.label]: orders.ms,
    },
    totals: {
      lead: leads.value.stageTotal,
      company: companies.value.ownerTotal,
      contact: contacts.value.ownerTotal,
      quote: quotes.value.statusTotal,
      order: orders.value.statusTotal,
    },
  };
}
