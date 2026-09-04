import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { QuoteStatusForm } from "@/components/quote/quote-status-form";
import { isAppError } from "@/lib/errors";
import { formatDate, formatEuroExact, formatPersonName } from "@/lib/format";
import { isQuoteConfigSnapshot } from "@/lib/quote-catalog";
import { getQuote } from "@/lib/quote-service";
import { quoteStatusLabels, quoteStatusTones } from "@/lib/quote-validation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const quote = await getQuote(id);
    return { title: quote.quoteNumber };
  } catch {
    return { title: "Offerte" };
  }
}

export default async function OfferteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote(id).catch((error) => {
    if (isAppError(error) && error.status === 404) notFound();
    throw error;
  });

  const vatRate = Number(quote.company.vatRate);
  const vatAmount = Math.round((Number(quote.total) * vatRate + Number.EPSILON) * 100) / 100;
  const grossTotal = Math.round((Number(quote.total) + vatAmount + Number.EPSILON) * 100) / 100;

  return (
    <div className="flex flex-col gap-8">
      <header className="page-header">
        <div className="page-header-copy">
          <h1 className="page-header-title">{quote.quoteNumber}</h1>
          <p className="page-header-description">
            <Link href="/offertes" className="hover:underline">
              Terug naar offertes
            </Link>
            {" · "}
            <Link href={`/bedrijven/${quote.company.id}`} className="hover:underline">
              {quote.company.name}
            </Link>
            {quote.contact
              ? ` · ${formatPersonName(quote.contact.firstName, quote.contact.lastName)}`
              : null}
            {quote.deal ? (
              <>
                {" · "}
                <Link href={`/leads/${quote.deal.id}`} className="hover:underline">
                  {quote.deal.title}
                </Link>
              </>
            ) : null}
            {` · ${formatDate(quote.createdAt)}`}
          </p>
        </div>
        <Badge tone={quoteStatusTones[quote.status]}>
          {quoteStatusLabels[quote.status]}
        </Badge>
      </header>

      <QuoteStatusForm quoteId={quote.id} status={quote.status} />

      <section className="flex flex-col gap-4">
        <h2 className="text-md font-medium text-fg">Regels</h2>
        {quote.items.map((item, index) => {
          const snapshot = isQuoteConfigSnapshot(item.configSnapshot)
            ? item.configSnapshot
            : null;
          return (
            <Card key={item.id} className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium text-fg">
                  {index + 1}. {snapshot?.productName ?? item.description ?? "Product"}
                </h3>
                <p className="text-sm text-fg-muted">
                  {item.quantity} × {formatEuroExact(Number(item.unitPrice))}
                </p>
              </div>
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
                <span>{formatEuroExact(Number(item.lineTotal))}</span>
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
        <div className="flex justify-between text-sm text-fg-muted">
          <span>Subtotaal</span>
          <span>{formatEuroExact(Number(quote.subtotal))}</span>
        </div>
        {Number(quote.discountTotal) > 0 ? (
          <div className="mt-1 flex justify-between text-sm text-fg-muted">
            <span>Korting</span>
            <span>− {formatEuroExact(Number(quote.discountTotal))}</span>
          </div>
        ) : null}
        <div className="mt-1 flex justify-between text-sm text-fg">
          <span>Totaal excl. btw</span>
          <span>{formatEuroExact(Number(quote.total))}</span>
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
    </div>
  );
}
