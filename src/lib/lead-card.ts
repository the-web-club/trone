import { formatEuro } from "@/lib/format";

export type LeadCardFactsInput<TQuote extends string = string> = {
  valueEstimate: number | null;
  quoteStatus: TQuote | null;
  sourceName: string | null;
};

export type LeadCardFacts<TQuote extends string = string> = {
  value: string | null;
  quoteStatus: TQuote | null;
  sourceName: string | null;
};

/** Compact extras for a lead card: hide empty overview fields, keep 0 and filled values. */
export function leadCardFacts<TQuote extends string>(
  input: LeadCardFactsInput<TQuote>,
): LeadCardFacts<TQuote> {
  const sourceName = input.sourceName?.trim() || null;
  return {
    value: formatEuro(input.valueEstimate),
    quoteStatus: input.quoteStatus,
    sourceName,
  };
}

export function hasLeadCardFacts(facts: LeadCardFacts): boolean {
  return Boolean(facts.value || facts.quoteStatus || facts.sourceName);
}
