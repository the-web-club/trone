"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CustomQuoteItemInput } from "@/lib/quote-validation";

function parsePriceInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

export function QuoteCustomLineEditor({
  item,
  index,
  canRemove,
  onChange,
  onRemove,
  priceBar,
}: {
  item: CustomQuoteItemInput;
  index: number;
  canRemove: boolean;
  onChange: (item: CustomQuoteItemInput) => void;
  onRemove: () => void;
  priceBar?: ReactNode;
}) {
  const [priceText, setPriceText] = useState(
    item.unitPrice == null ? "" : String(item.unitPrice).replace(".", ","),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-xl flex-col gap-4">
        <FormField id={`custom-title-${index}`} label="Titel">
          <Input
            value={item.title}
            onChange={(event) =>
              onChange({ ...item, title: event.target.value })
            }
            placeholder="Bijvoorbeeld montage of transport"
            required
          />
        </FormField>
        <FormField
          id={`custom-price-${index}`}
          label="Prijs excl. btw (optioneel)"
        >
          <Input
            inputMode="decimal"
            value={priceText}
            onChange={(event) => {
              const next = event.target.value;
              setPriceText(next);
              onChange({ ...item, unitPrice: parsePriceInput(next) });
            }}
            placeholder="Leeg laten indien geen prijs"
          />
        </FormField>
        <FormField id={`custom-description-${index}`} label="Omschrijving">
          <Textarea
            value={item.description}
            onChange={(event) =>
              onChange({ ...item, description: event.target.value })
            }
            placeholder="Toelichting voor de klant"
            rows={5}
          />
        </FormField>
        {canRemove ? (
          <div>
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              Regel {index + 1} verwijderen
            </Button>
          </div>
        ) : null}
      </div>
      {priceBar ? (
        <div className="sticky bottom-0 z-[var(--z-sticky)] -mx-3 lg:mx-0">
          {priceBar}
        </div>
      ) : null}
    </div>
  );
}
