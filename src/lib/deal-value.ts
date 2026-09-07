export const DEAL_VALUE_QUOTE_STATUSES = ["DRAFT", "SENT", "ACCEPTED"] as const;

export type DealValueQuote = {
  total: { toString(): string } | number | string;
  status: string;
};

function roundCents(value: number) {
  return Math.round(value * 100) / 100;
}

function isActiveQuoteStatus(status: string) {
  return (DEAL_VALUE_QUOTE_STATUSES as readonly string[]).includes(status);
}

/** Som van concept-, verzonden- en geaccepteerde offertes; anders null. */
export function sumActiveQuoteTotals(
  quotes: DealValueQuote[],
): number | null {
  const active = quotes.filter((quote) => isActiveQuoteStatus(quote.status));
  if (active.length === 0) return null;
  return roundCents(
    active.reduce((sum, quote) => sum + Number(quote.total), 0),
  );
}

/** Offertetotaal als die er is, anders de handmatige schatting. */
export function effectiveDealValue(
  valueEstimate: number | null,
  quotes: DealValueQuote[],
): number | null {
  return sumActiveQuoteTotals(quotes) ?? valueEstimate;
}
