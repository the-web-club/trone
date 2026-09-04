"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import {
  ChoiceTile,
  ChoiceTileGroup,
} from "@/components/configurator/choice-tile";
import { OptionSection } from "@/components/configurator/option-section";
import { OptionToggle } from "@/components/configurator/option-toggle";
import {
  canClearOptionalChoice,
  configuratorSplitClass,
  displayOptionValues,
  ensurePreferredSelections,
  groupOptions,
  internalSelectionId,
  visualSelectionId,
} from "@/components/configurator/option-groups";
import { meerprijsLabel } from "@/components/configurator/price-copy";
import { ProductStage } from "@/components/configurator/product-stage";
import { SwatchDots } from "@/components/configurator/swatch-dots";
import { Button } from "@/components/ui/button";
import { calculatePrice, validateConfiguration } from "@/lib/pricing";
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
  priceBar,
}: {
  catalog: QuoteCatalog;
  item: QuoteItemInput;
  vatRate: number;
  discountPercent: number;
  index: number;
  canRemove: boolean;
  onChange: (item: QuoteItemInput) => void;
  onRemove: () => void;
  priceBar?: ReactNode;
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
  const incompleteCodes = new Set(
    errors
      .filter((error) => error.code === "REQUIRED_OPTION_MISSING")
      .map((error) => error.optionCode)
      .filter((code): code is string => Boolean(code)),
  );
  const price = calculatePrice(input, ctx);
  const product = catalog.products.find((row) => row.id === item.productId);
  const imageUrl = resolveImage(item.productId, item.selections, catalog.images);
  const sections = groupOptions(options);

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
    onChange({
      ...item,
      productId,
      selections: ensurePreferredSelections(catalog, productId, selections),
    });
  }

  function setSelection(optionId: string, optionValueId: string) {
    const option = options.find((row) => row.id === optionId);
    const storedId = option
      ? internalSelectionId(option, optionValueId)
      : optionValueId;
    const rest = item.selections.filter((selection) => selection.optionId !== optionId);
    if (!storedId) {
      onChange({ ...item, selections: rest });
      return;
    }
    onChange({
      ...item,
      selections: [...rest, { optionId, optionValueId: storedId }],
    });
  }

  function selectedValue(optionId: string) {
    return (
      item.selections.find((selection) => selection.optionId === optionId)
        ?.optionValueId ?? ""
    );
  }

  function setQuantity(next: number) {
    onChange({ ...item, quantity: Math.max(1, next) });
  }

  return (
    <div className={configuratorSplitClass}>
      <div className="flex min-w-0 flex-col max-lg:contents lg:sticky lg:top-4 lg:min-h-[calc(100dvh-var(--topbar-h)-var(--space-7))]">
        <ProductStage
          src={imageUrl}
          alt={product ? `${product.name}, geconfigureerd` : "Productbeeld"}
          className="order-1 lg:min-h-0 lg:flex-1"
        />
        {priceBar ? (
          <div className="order-3 sticky bottom-0 z-[var(--z-sticky)] lg:order-2">
            {priceBar}
          </div>
        ) : null}
      </div>

      <div className="order-2 flex flex-col gap-8">
        <OptionSection title="Model">
          <ChoiceTileGroup label="Product">
            {catalog.products.map((row) => (
              <ChoiceTile
                key={row.id}
                selected={row.id === item.productId}
                label={row.name}
                priceLabel={formatEuroExact(row.basePrice)}
                onSelect={() => setProduct(row.id)}
              />
            ))}
          </ChoiceTileGroup>
          <div className="mt-2 flex items-center justify-between gap-3 px-1">
            <p className="text-sm text-fg-muted">Aantal</p>
            <div
              role="group"
              aria-label="Aantal"
              className="flex items-center gap-2"
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                aria-label="Aantal verlagen"
                disabled={item.quantity <= 1}
                onClick={() => setQuantity(item.quantity - 1)}
              >
                −
              </Button>
              <span className="min-w-8 text-center text-sm font-medium text-fg" aria-live="polite">
                {item.quantity}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                aria-label="Aantal verhogen"
                onClick={() => setQuantity(item.quantity + 1)}
              >
                +
              </Button>
            </div>
          </div>
        </OptionSection>

        {sections.map((section) => {
          const incomplete = section.options.some((option) =>
            incompleteCodes.has(option.code),
          );
          return (
            <OptionSection
              key={section.id}
              title={section.title}
              incomplete={incomplete}
            >
              <div className="flex flex-col gap-6">
                {section.options.map((option) => {
                  const values = displayOptionValues(
                    option,
                    valuesForProductOption(catalog, item.productId, option),
                  );
                  const current = visualSelectionId(
                    option,
                    selectedValue(option.id),
                  );

                  if (isSwatchOption(option.code)) {
                    return (
                      <div key={option.id} className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-fg">{option.name}</p>
                        <SwatchDots
                          optionName={option.name}
                          values={values}
                          selectedId={current}
                          onSelect={(optionValueId) =>
                            setSelection(option.id, optionValueId)
                          }
                        />
                      </div>
                    );
                  }

                  if (option.inputType === "boolean") {
                    const ja = values[0];
                    if (!ja) return null;
                    return (
                      <OptionToggle
                        key={option.id}
                        name={option.name}
                        checked={current === ja.id}
                        priceLabel={meerprijsLabel(ja)}
                        onRequest={ja.priceOnRequest}
                        onChange={(next) =>
                          setSelection(option.id, next ? ja.id : "")
                        }
                      />
                    );
                  }

                  const canClear =
                    canClearOptionalChoice(option) && Boolean(current);

                  return (
                    <div key={option.id} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-fg">{option.name}</p>
                        {canClear ? (
                          <button
                            type="button"
                            aria-label={`${option.name} wissen`}
                            onClick={() => setSelection(option.id, "")}
                            className="inline-flex items-center gap-1 text-label text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
                          >
                            <X className="size-3.5" strokeWidth={2} aria-hidden />
                            Wis keuze
                          </button>
                        ) : null}
                      </div>
                      <ChoiceTileGroup label={option.name}>
                        {values.map((value) => (
                          <ChoiceTile
                            key={value.id}
                            selected={value.id === current}
                            label={value.value}
                            priceLabel={meerprijsLabel(value)}
                            onSelect={() => setSelection(option.id, value.id)}
                          />
                        ))}
                      </ChoiceTileGroup>
                      {values.some((value) => value.priceOnRequest && value.id === current) ? (
                        <p className="px-1 text-label text-fg-subtle">
                          De productspecialist bepaalt de prijs.
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </OptionSection>
          );
        })}

        {canRemove ? (
          <div>
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              Stoel {index + 1} verwijderen
            </Button>
          </div>
        ) : null}

        <p className="sr-only" aria-live="polite">
          {errors.length === 0
            ? `Prijs ${price.hasOnRequest ? `${formatEuroExact(price.netTotal)} plus nader te bepalen` : formatEuroExact(price.netTotal)}`
            : "Configuratie is nog niet volledig"}
        </p>
      </div>
    </div>
  );
}
