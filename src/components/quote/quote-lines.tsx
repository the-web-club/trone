import { Card } from "@/components/ui/card";
import { VatTreatmentNotice } from "@/components/vat/vat-treatment-notice";
import { formatEuroExact } from "@/lib/format";
import { vatOnNet } from "@/lib/pricing";
import { isQuoteConfigSnapshot, quoteLinePresentation } from "@/lib/quote-catalog";
import type { VatRegime } from "@/lib/vat";

export type QuoteLineView = {
  id: string;
  description: string | null;
  quantity: number;
  unitPrice: { toString(): string } | number;
  lineTotal: { toString(): string } | number;
  configSnapshot: unknown;
};

export function QuoteLines({
  items,
  vatRate,
  vatRegime,
  vatNotice,
  subtotal,
  discountTotal,
  total,
}: {
  items: QuoteLineView[];
  vatRate: number;
  vatRegime?: VatRegime | null;
  vatNotice?: string | null;
  subtotal: number;
  discountTotal: number;
  total: number;
}) {
  const { vatAmount, grossTotal } = vatOnNet(total, vatRate);

  return (
    <>
      <section className="flex flex-col gap-4">
        <h2 className="text-md font-medium text-fg">Regels</h2>
        {items.map((item, index) => {
          const snapshot = isQuoteConfigSnapshot(item.configSnapshot)
            ? item.configSnapshot
            : null;
          const presentation = quoteLinePresentation(item);
          const linePrice = presentation.hasPrice
            ? Number(item.unitPrice)
            : null;
          const lineTotal = presentation.hasPrice
            ? Number(item.lineTotal)
            : null;
          return (
            <Card key={item.id} className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium text-fg">
                  {index + 1}. {presentation.title}
                </h3>
                <p className="text-sm text-fg-muted">
                  {presentation.isCustom
                    ? formatEuroExact(linePrice)
                    : `${item.quantity} × ${formatEuroExact(linePrice)}`}
                </p>
              </div>
              {presentation.body ? (
                <p className="text-sm font-normal text-fg-muted whitespace-pre-wrap">
                  {presentation.body}
                </p>
              ) : null}
              {snapshot ? (
                <ul className="flex flex-col gap-1">
                  {snapshot.selections.map((selection) => (
                    <li
                      key={`${selection.optionId}-${selection.optionValueId}`}
                      className="flex justify-between gap-3 text-sm text-fg-muted"
                    >
                      <span>
                        {selection.optionName}: {selection.value}
                      </span>
                      <span>
                        {selection.priceOnRequest
                          ? "Prijs op aanvraag"
                          : formatEuroExact(selection.priceDelta)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex justify-between text-sm font-medium text-fg">
                <span>Bevroren regeltotaal excl. btw</span>
                <span>{formatEuroExact(lineTotal)}</span>
              </div>
              {snapshot?.price.hasOnRequest ? (
                <p className="text-xs text-warning">
                  Bevat opties met prijs op aanvraag (n.t.b. door productspecialist).
                </p>
              ) : null}
            </Card>
          );
        })}
      </section>

      <section className="rounded-md border border-border bg-surface px-4 py-3">
        <div className="mb-3">
          <VatTreatmentNotice
            vatRate={vatRate}
            vatRegime={vatRegime}
            warning={vatNotice}
          />
        </div>
        <div className="flex justify-between text-sm text-fg-muted">
          <span>Subtotaal</span>
          <span>{formatEuroExact(subtotal)}</span>
        </div>
        {discountTotal > 0 ? (
          <div className="mt-1 flex justify-between text-sm text-fg-muted">
            <span>Korting</span>
            <span>− {formatEuroExact(discountTotal)}</span>
          </div>
        ) : null}
        <div className="mt-1 flex justify-between text-sm text-fg">
          <span>Totaal excl. btw</span>
          <span>{formatEuroExact(total)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm text-fg-muted">
          <span>Btw {vatRate}%</span>
          <span>{formatEuroExact(vatAmount)}</span>
        </div>
        <div className="mt-2 flex justify-between text-md font-medium text-fg">
          <span>Totaal incl. btw</span>
          <span>{formatEuroExact(grossTotal)}</span>
        </div>
      </section>
    </>
  );
}
