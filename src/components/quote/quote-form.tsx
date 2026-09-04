"use client";

import { useActionState, useMemo, useState } from "react";
import { createQuoteAction } from "@/app/(beveiligd)/actions/quote-actions";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { QuoteLineEditor } from "@/components/quote/quote-line-editor";
import { calculatePrice } from "@/lib/pricing";
import { formatPersonName, formatEuroExact } from "@/lib/format";
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
  return {
    productId,
    quantity: 1,
    selections: productId ? defaultSelections(catalog, productId) : [],
  };
}

export function QuoteForm({
  catalog,
  companies,
  contacts,
  deals,
  initialCompanyId,
  initialDealId,
}: {
  catalog: QuoteCatalog;
  companies: QuoteFormCompany[];
  contacts: QuoteFormContact[];
  deals: QuoteFormDeal[];
  initialCompanyId?: string;
  initialDealId?: string;
}) {
  const [state, formAction, pending] = useActionState(createQuoteAction, null);
  const [companyId, setCompanyId] = useState(initialCompanyId ?? "");
  const [contactId, setContactId] = useState("");
  const [dealId, setDealId] = useState(initialDealId ?? "");
  const [items, setItems] = useState<QuoteItemInput[]>([emptyLine(catalog)]);

  const company = companies.find((row) => row.id === companyId);
  const vatRate = company?.vatRate ?? 21;
  const ctx = useMemo(() => toPricingContext(catalog), [catalog]);

  const visibleContacts = contacts.filter(
    (contact) => !companyId || !contact.companyId || contact.companyId === companyId,
  );
  const visibleDeals = deals.filter(
    (deal) => !companyId || !deal.companyId || deal.companyId === companyId,
  );

  function onCompanyChange(nextCompanyId: string) {
    setCompanyId(nextCompanyId);
    const selectedContact = contacts.find((contact) => contact.id === contactId);
    if (
      selectedContact?.companyId &&
      nextCompanyId &&
      selectedContact.companyId !== nextCompanyId
    ) {
      setContactId("");
    }
    const selectedDeal = deals.find((deal) => deal.id === dealId);
    if (
      selectedDeal?.companyId &&
      nextCompanyId &&
      selectedDeal.companyId !== nextCompanyId
    ) {
      setDealId("");
    }
  }

  const pricedItems = items.map((item) => {
    const discountPercent = resolveDiscountPercent(
      company?.discounts ?? [],
      item.productId,
    );
    return calculatePrice(
      {
        productId: item.productId,
        selections: item.selections,
        quantity: item.quantity,
        vatRate,
        discountPercent,
      },
      ctx,
    );
  });

  const netTotal = pricedItems.reduce((sum, price) => sum + price.netTotal, 0);
  const vatAmount = pricedItems.reduce((sum, price) => sum + price.vatAmount, 0);
  const grossTotal = pricedItems.reduce((sum, price) => sum + price.grossTotal, 0);
  const hasOnRequest = pricedItems.some((price) => price.hasOnRequest);

  const payload = {
    companyId,
    contactId: contactId || undefined,
    dealId: dealId || undefined,
    items,
  };

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <section className="grid gap-4 md:grid-cols-3">
        <FormField id="companyId" label="Klant">
          <Select
            required
            value={companyId}
            onChange={(event) => onCompanyChange(event.target.value)}
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
            onChange={(event) => setContactId(event.target.value)}
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
          <Select value={dealId} onChange={(event) => setDealId(event.target.value)}>
            <option value="">Geen lead gekoppeld</option>
            {visibleDeals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.title}
              </option>
            ))}
          </Select>
        </FormField>
      </section>

      <section className="flex flex-col gap-3">
        {items.map((item, index) => (
          <QuoteLineEditor
            key={`${item.productId}-${index}`}
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
              setItems((list) => list.map((row, rowIndex) => (rowIndex === index ? next : row)))
            }
            onRemove={() =>
              setItems((list) => list.filter((_, rowIndex) => rowIndex !== index))
            }
          />
        ))}
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setItems((list) => [...list, emptyLine(catalog)])}
          >
            Regel toevoegen
          </Button>
        </div>
      </section>

      <section className="rounded-md border border-border bg-surface px-4 py-3">
        <div className="flex justify-between text-sm text-fg">
          <span>Subtotaal excl. btw</span>
          <span>{formatEuroExact(netTotal)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm text-fg-muted">
          <span>Btw {vatRate}%</span>
          <span>{formatEuroExact(vatAmount)}</span>
        </div>
        <div className="mt-2 flex justify-between text-md font-medium text-fg">
          <span>Totaal incl. btw</span>
          <span>{formatEuroExact(grossTotal)}</span>
        </div>
        {hasOnRequest ? (
          <p className="mt-2 text-xs text-warning">
            Totaal is excl. opties met prijs op aanvraag.
          </p>
        ) : null}
        <p className="mt-2 text-xs text-fg-muted">
          Live prijs ter indicatie. Bij opslaan herberekent de server het
          bindende bedrag.
        </p>
      </section>

      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" loading={pending} disabled={!companyId}>
          Offerte opslaan
        </Button>
      </div>
    </form>
  );
}
