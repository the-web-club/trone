"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { listDealsForSelectAction } from "@/app/(beveiligd)/actions/deal-actions";
import {
  createQuoteAction,
  updateQuoteAction,
} from "@/app/(beveiligd)/actions/quote-actions";
import { useCompanyContactFields } from "@/components/contact/use-company-contact-fields";
import { PriceBar } from "@/components/configurator/price-bar";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { QuoteLineEditor } from "@/components/quote/quote-line-editor";
import { calculatePrice, validateConfiguration } from "@/lib/pricing";
import { formatPersonName } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ensurePreferredSelections } from "@/components/configurator/option-groups";
import {
  defaultSelections,
  resolveDiscountPercent,
  toPricingContext,
  type QuoteCatalog,
} from "@/lib/quote-catalog";
import type { QuoteItemInput } from "@/lib/quote-validation";

export type QuoteFormCompany = {
  id: string;
  name: string;
  vatRate: number;
  discounts: { productId: string | null; discountPercent: number }[];
};

export type QuoteFormContact = {
  id: string;
  firstName: string;
  lastName: string | null;
  companyId: string | null;
};

export type QuoteFormDeal = {
  id: string;
  title: string;
  companyId: string | null;
};

function emptyLine(catalog: QuoteCatalog): QuoteItemInput {
  const productId = catalog.products[0]?.id ?? "";
  const selections = productId ? defaultSelections(catalog, productId) : [];
  return {
    productId,
    quantity: 1,
    selections: productId
      ? ensurePreferredSelections(catalog, productId, selections)
      : selections,
  };
}

export function QuoteForm({
  catalog,
  companies,
  contacts,
  deals,
  initialCompanyId,
  initialContactId,
  initialDealId,
  initialItems,
  quoteId,
}: {
  catalog: QuoteCatalog;
  companies: QuoteFormCompany[];
  contacts: QuoteFormContact[];
  deals: QuoteFormDeal[];
  initialCompanyId?: string;
  initialContactId?: string;
  initialDealId?: string;
  initialItems?: QuoteItemInput[];
  quoteId?: string;
}) {
  const isEdit = Boolean(quoteId);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateQuoteAction : createQuoteAction,
    null,
  );
  const {
    companyId,
    contactId,
    contacts: visibleContacts,
    contactsLoading,
    onCompanyChange,
    onContactChange,
  } = useCompanyContactFields({
    initialCompanyId,
    initialContactId,
    initialContacts: contacts,
  });
  const [dealId, setDealId] = useState(initialDealId ?? "");
  const [visibleDeals, setVisibleDeals] = useState(deals);
  const [dealsLoading, setDealsLoading] = useState(false);
  const dealsRequestId = useRef(0);
  const [items, setItems] = useState<QuoteItemInput[]>(
    initialItems && initialItems.length > 0 ? initialItems : [emptyLine(catalog)],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  const company = companies.find((row) => row.id === companyId);
  const vatRate = company?.vatRate ?? 21;
  const ctx = useMemo(() => toPricingContext(catalog), [catalog]);

  function loadDeals(nextCompanyId: string) {
    const id = ++dealsRequestId.current;
    setDealsLoading(true);
    listDealsForSelectAction(nextCompanyId || null)
      .then((rows) => {
        if (id !== dealsRequestId.current) return;
        setVisibleDeals(rows);
        setDealId((current) =>
          !current || rows.some((deal) => deal.id === current) ? current : "",
        );
      })
      .finally(() => {
        if (id === dealsRequestId.current) setDealsLoading(false);
      });
  }

  function handleCompanyChange(nextCompanyId: string) {
    const applied = onCompanyChange(nextCompanyId);
    if (applied != null) loadDeals(applied.companyId);
  }

  function handleContactChange(nextContactId: string) {
    const previousCompanyId = companyId;
    const next = onContactChange(nextContactId);
    if (next.companyId !== previousCompanyId) loadDeals(next.companyId);
  }

  const pricedItems = items.map((item) => {
    const discountPercent = resolveDiscountPercent(
      company?.discounts ?? [],
      item.productId,
    );
    const input = {
      productId: item.productId,
      selections: item.selections,
      quantity: item.quantity,
      vatRate,
      discountPercent,
    };
    return {
      price: calculatePrice(input, ctx),
      errors: validateConfiguration(input, ctx),
    };
  });

  const netTotal = pricedItems.reduce((sum, row) => sum + row.price.netTotal, 0);
  const active = pricedItems[activeIndex];
  const activeValid = (active?.errors.length ?? 1) === 0;
  const allValid = pricedItems.every((row) => row.errors.length === 0);
  const canSubmit = Boolean(companyId) && allValid && items.length > 0;
  const submitDisabledReason = !companyId
    ? "Kies eerst een klant."
    : !allValid
      ? "Maak de configuratie compleet om toe te voegen."
      : undefined;

  const payload = {
    companyId,
    contactId: contactId || undefined,
    dealId: dealId || undefined,
    items,
  };

  function addLine() {
    if (!activeValid) return;
    setItems((list) => [...list, emptyLine(catalog)]);
    setActiveIndex(items.length);
  }

  return (
    <form action={formAction} className="flex flex-col" data-configurator-page="">
      {quoteId ? <input type="hidden" name="id" value={quoteId} /> : null}
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <div className="flex flex-col max-lg:pb-[var(--configurator-bar-space)]">
      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <FormField id="companyId" label="Klant">
          <Select
            required
            value={companyId}
            onChange={(event) => handleCompanyChange(event.target.value)}
          >
            <option value="">Kies een klant</option>
            {companies.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="contactId" label="Contactpersoon">
          <Select
            value={contactId}
            disabled={contactsLoading}
            onChange={(event) => handleContactChange(event.target.value)}
          >
            <option value="">Geen contactpersoon</option>
            {visibleContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {formatPersonName(contact.firstName, contact.lastName)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="dealId" label="Lead">
          <Select
            value={dealId}
            disabled={dealsLoading}
            onChange={(event) => setDealId(event.target.value)}
          >
            <option value="">Geen lead gekoppeld</option>
            {visibleDeals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.title}
              </option>
            ))}
          </Select>
        </FormField>
      </section>

      {items.length > 1 ? (
        <nav aria-label="Stoelen op deze offerte" className="mb-6 flex flex-wrap gap-1.5">
          {items.map((item, index) => {
            const product = catalog.products.find((row) => row.id === item.productId);
            const selected = index === activeIndex;
            const valid = pricedItems[index]?.errors.length === 0;
            return (
              <button
                key={`${item.productId}-${index}`}
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
                  selected
                    ? "bg-selected-bg text-fg shadow-[inset_0_0_0_1px_var(--accent)]"
                    : "text-fg-muted hover:bg-hover-subtle hover:text-fg",
                  !valid && "text-warning",
                )}
              >
                {product?.name ?? "Stoel"} {items.length > 1 ? index + 1 : ""}
              </button>
            );
          })}
        </nav>
      ) : null}

      {items.map((item, index) => (
        <div key={`${item.productId}-${index}`} hidden={index !== activeIndex}>
          <QuoteLineEditor
            catalog={catalog}
            item={item}
            index={index}
            vatRate={vatRate}
            discountPercent={resolveDiscountPercent(
              company?.discounts ?? [],
              item.productId,
            )}
            canRemove={items.length > 1}
            onChange={(next) =>
              setItems((list) =>
                list.map((row, rowIndex) =>
                  rowIndex === index
                    ? {
                        ...next,
                        selections: ensurePreferredSelections(
                          catalog,
                          next.productId,
                          next.selections,
                        ),
                      }
                    : row,
                ),
              )
            }
            onRemove={() => {
              setItems((list) => list.filter((_, rowIndex) => rowIndex !== index));
              setActiveIndex((current) => {
                if (index < current) return current - 1;
                return Math.min(current, items.length - 2);
              });
            }}
            priceBar={
              index === activeIndex ? (
                <PriceBar
                  price={active?.price ?? null}
                  canSubmit={canSubmit}
                  canAddLine={activeValid}
                  submitDisabledReason={submitDisabledReason}
                  pending={pending}
                  onAddLine={addLine}
                  hasMultipleLines={items.length > 1}
                  quoteNetTotal={netTotal}
                  submitLabel={
                    isEdit ? "Wijzigingen opslaan" : "Toevoegen aan offerte"
                  }
                />
              ) : null
            }
          />
        </div>
      ))}

      {state?.error ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      </div>
    </form>
  );
}
