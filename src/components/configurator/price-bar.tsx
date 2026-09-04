"use client";

import { useState } from "react";
import { AnimatedPrice } from "@/components/configurator/animated-price";
import { OP_AANVRAAG_HINT } from "@/components/configurator/price-copy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatEuroExact } from "@/lib/format";
import type { PriceResult } from "@/lib/pricing";

export function PriceBar({
  price,
  canSubmit,
  canAddLine,
  submitDisabledReason,
  pending,
  onAddLine,
  hasMultipleLines,
  quoteNetTotal,
}: {
  price: PriceResult | null;
  canSubmit: boolean;
  canAddLine: boolean;
  submitDisabledReason?: string;
  pending: boolean;
  onAddLine: () => void;
  hasMultipleLines: boolean;
  quoteNetTotal?: number;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const totalLabel = price
    ? price.hasOnRequest
      ? `${formatEuroExact(price.netTotal)} + n.t.b.`
      : formatEuroExact(price.netTotal)
    : "—";

  return (
    <div
      className={cn(
        "sticky bottom-0 z-[var(--z-sticky)] -mx-1 mt-8 border-t border-border bg-bg/95 px-1 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "backdrop-blur-[2px]",
      )}
    >
      {detailsOpen && price ? (
        <div className="mb-4 flex flex-col gap-1.5 px-1">
          <p className="text-label font-medium tracking-wide text-fg-muted uppercase">
            Prijsdetails
          </p>
          <div className="flex justify-between gap-4 text-sm text-fg-muted">
            <span>Basis {price.productName}</span>
            <span>{formatEuroExact(price.basePrice)}</span>
          </div>
          {price.optionLines
            .filter((line) => line.onRequest || line.amount !== 0)
            .map((line) => (
              <div
                key={line.label}
                className="flex justify-between gap-4 text-sm text-fg-muted"
              >
                <span>{line.label}</span>
                <span>
                  {line.onRequest ? "Op aanvraag" : formatEuroExact(line.amount)}
                </span>
              </div>
            ))}
          {price.discountAmount > 0 ? (
            <div className="flex justify-between gap-4 text-sm text-fg-muted">
              <span>Korting {price.discountPercent}%</span>
              <span>− {formatEuroExact(price.discountAmount)}</span>
            </div>
          ) : null}
          <div className="mt-1 flex justify-between gap-4 text-sm text-fg">
            <span>
              {price.quantity > 1
                ? `Deze stoel · ${price.quantity} stuks excl. btw`
                : "Deze stoel excl. btw"}
            </span>
            <span>{formatEuroExact(price.netTotal)}</span>
          </div>
          {hasMultipleLines && quoteNetTotal != null ? (
            <div className="flex justify-between gap-4 text-sm font-medium text-fg">
              <span>Offerte excl. btw</span>
              <span>{formatEuroExact(quoteNetTotal)}</span>
            </div>
          ) : null}
          {price.hasOnRequest ? (
            <p className="pt-1 text-label text-fg-subtle">{OP_AANVRAAG_HINT}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-label text-fg-muted">Totaal excl. btw</p>
          <p className="text-2xl font-medium tracking-tight text-fg">
            <AnimatedPrice value={totalLabel} />
          </p>
          <button
            type="button"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((open) => !open)}
            className={cn(
              "w-fit text-label text-fg-muted underline-offset-2 hover:text-fg hover:underline",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
            )}
          >
            {detailsOpen ? "Prijsdetails verbergen" : "Prijsdetails"}
          </button>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={!canAddLine}
              onClick={onAddLine}
            >
              Nog een stoel
            </Button>
            <Button type="submit" loading={pending} disabled={!canSubmit}>
              Toevoegen aan offerte
            </Button>
          </div>
          {!canSubmit && submitDisabledReason ? (
            <p className="text-label text-fg-subtle">{submitDisabledReason}</p>
          ) : (
            <p className="text-label text-fg-subtle">
              Live prijs ter indicatie. Bij opslaan herberekent de server het
              bindende bedrag.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
