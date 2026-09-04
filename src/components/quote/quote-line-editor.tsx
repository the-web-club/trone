"use client";

import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { calculatePrice, validateConfiguration } from "@/lib/pricing";
import { OptionSwatches } from "@/components/quote/option-swatches";
import {
  optionsForProduct,
  toPricingContext,
  valuesForProductOption,
  type QuoteCatalog,
} from "@/lib/quote-catalog";
import { formatEuroExact } from "@/lib/format";
import { isSwatchOption, resolveImage } from "@/lib/product-visuals";
import type { QuoteItemInput } from "@/lib/quote-validation";

export function QuoteLineEditor({
  catalog,
  item,
  vatRate,
  discountPercent,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  catalog: QuoteCatalog;
  item: QuoteItemInput;
  vatRate: number;
  discountPercent: number;
  index: number;
  canRemove: boolean;
  onChange: (item: QuoteItemInput) => void;
  onRemove: () => void;
}) {
  const ctx = toPricingContext(catalog);
  const options = optionsForProduct(catalog, item.productId);
  const input = {
    productId: item.productId,
    selections: item.selections,
    quantity: item.quantity,
    vatRate,
    discountPercent,
  };
  const errors = validateConfiguration(input, ctx);
  const price = calculatePrice(input, ctx);
  const canShowPrice = errors.length === 0;
  const imageUrl = resolveImage(item.productId, item.selections, catalog.images);

  function setProduct(productId: string) {
    const nextOptions = optionsForProduct(catalog, productId);
    const allowed = new Set(nextOptions.map((option) => option.id));
    const kept = item.selections.filter((selection) => allowed.has(selection.optionId));
    const required = nextOptions.filter((option) => option.isRequired);
    const selections = [...kept];
    for (const option of required) {
      if (selections.some((selection) => selection.optionId === option.id)) continue;
      const first = valuesForProductOption(catalog, productId, option)[0];
      if (first) {
        selections.push({ optionId: option.id, optionValueId: first.id });
      }
    }
    onChange({ ...item, productId, selections });
  }

  function setSelection(optionId: string, optionValueId: string) {
    const rest = item.selections.filter((selection) => selection.optionId !== optionId);
    if (!optionValueId) {
      onChange({ ...item, selections: rest });
      return;
    }
    onChange({
      ...item,
      selections: [...rest, { optionId, optionValueId }],
    });
  }

  function selectedValue(optionId: string) {
    return (
      item.selections.find((selection) => selection.optionId === optionId)
        ?.optionValueId ?? ""
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-sm font-medium text-fg">Regel {index + 1}</h3>
        {canRemove ? (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Regel verwijderen
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-sm border border-border bg-surface-sunk">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-56 w-full object-cover" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={`product-${index}`} label="Product">
          <Select
            value={item.productId}
            onChange={(event) => setProduct(event.target.value)}
          >
            {catalog.products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id={`quantity-${index}`} label="Aantal">
          <Input
            type="number"
            min={1}
            step={1}
            value={item.quantity}
            onChange={(event) =>
              onChange({
                ...item,
                quantity: Math.max(1, Number(event.target.value) || 1),
              })
            }
          />
        </FormField>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const values = valuesForProductOption(catalog, item.productId, option);
          const current = selectedValue(option.id);
          if (isSwatchOption(option.code)) {
            return (
              <OptionSwatches
                key={option.id}
                optionName={option.name}
                values={values}
                selectedId={current}
                onSelect={(optionValueId) => setSelection(option.id, optionValueId)}
              />
            );
          }

          if (option.inputType === "boolean") {
            const ja = values[0];
            if (!ja) return null;
            return (
              <label
                key={option.id}
                className="flex h-8 items-center gap-2 text-sm text-fg"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--accent)]"
                  checked={current === ja.id}
                  onChange={(event) =>
                    setSelection(option.id, event.target.checked ? ja.id : "")
                  }
                />
                {option.name}
                {ja.priceOnRequest
                  ? " (prijs op aanvraag)"
                  : ja.priceDelta
                    ? ` (+${formatEuroExact(ja.priceDelta)})`
                    : null}
              </label>
            );
          }

          return (
            <FormField key={option.id} id={`${option.id}-${index}`} label={option.name}>
              <Select
                required={option.isRequired}
                value={current}
                onChange={(event) => setSelection(option.id, event.target.value)}
              >
                {option.isRequired ? null : <option value="">Geen</option>}
                {values.map((value) => (
                  <option key={value.id} value={value.id}>
                    {value.priceOnRequest
                      ? `${value.value} — prijs op aanvraag`
                      : value.priceDelta
                        ? `${value.value} (+${formatEuroExact(value.priceDelta)})`
                        : value.value}
                  </option>
                ))}
              </Select>
            </FormField>
          );
        })}
      </div>

      <div className="rounded-sm border border-border bg-surface-sunk/60 px-3 py-2">
        {canShowPrice ? (
          <div className="flex flex-col gap-1">
            {price.optionLines.map((line) => (
              <div
                key={line.label}
                className="flex justify-between gap-3 text-xs text-fg-muted"
              >
                <span>{line.label}</span>
                <span>
                  {line.onRequest ? "Prijs op aanvraag" : formatEuroExact(line.amount)}
                </span>
              </div>
            ))}
            <div className="mt-1 flex justify-between text-sm font-medium text-fg">
              <span>Regel totaal excl. btw</span>
              <span>
                {price.hasOnRequest ? `${formatEuroExact(price.netTotal)} + n.t.b.` : formatEuroExact(price.netTotal)}
              </span>
            </div>
            {price.hasOnRequest ? (
              <p className="text-xs text-warning">
                Bevat opties met prijs op aanvraag (n.t.b. door productspecialist).
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-danger" role="alert">
            {errors.map((error) => error.message).join(" ")}
          </p>
        )}
      </div>
    </Card>
  );
}
