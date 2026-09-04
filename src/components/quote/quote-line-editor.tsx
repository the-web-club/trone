"use client";

import {
  ChoiceTile,
  ChoiceTileGroup,
} from "@/components/configurator/choice-tile";
import { OptionSection } from "@/components/configurator/option-section";
import { OptionToggle } from "@/components/configurator/option-toggle";
import {
  displayOptionValues,
  ensurePreferredSelections,
  groupOptions,
  showNoneChoice,
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

  function setQuantity(next: number) {
    onChange({ ...item, quantity: Math.max(1, next) });
  }

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,28rem)] lg:items-start lg:gap-10">
      <ProductStage
        src={imageUrl}
        alt={product ? `${product.name}, geconfigureerd` : "Productbeeld"}
        className="lg:sticky lg:top-4"
      />

      <div className="flex flex-col gap-8">
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
              <div className="flex flex-col gap-5">
                {section.options.map((option) => {
                  const values = displayOptionValues(
                    option,
                    valuesForProductOption(catalog, item.productId, option),
                  );
                  const current = selectedValue(option.id);

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

                  return (
                    <div key={option.id} className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-fg">{option.name}</p>
                      <ChoiceTileGroup label={option.name}>
                        {showNoneChoice(option) ? (
                          <ChoiceTile
                            selected={!current}
                            label="Geen"
                            onSelect={() => setSelection(option.id, "")}
                          />
                        ) : null}
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
