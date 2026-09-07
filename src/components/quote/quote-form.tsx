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
import { ComboboxMenu } from "@/components/ui/combobox";
import { CreateCustomerDialog } from "@/components/quote/create-customer-dialog";
import { CreateQuoteContactDialog } from "@/components/quote/create-contact-dialog";
import { CreateLeadDialog } from "@/components/quote/create-lead-dialog";
import { QuoteLineEditor } from "@/components/quote/quote-line-editor";
import { Button } from "@/components/ui/button";
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
    applySelection,
  } = useCompanyContactFields({
    initialCompanyId,
    initialContactId,
    initialContacts: contacts,
  });
  const [companyList, setCompanyList] = useState(companies);
  const [dealId, setDealId] = useState(initialDealId ?? "");
  const [visibleDeals, setVisibleDeals] = useState(deals);
  const [dealsLoading, setDealsLoading] = useState(false);
  const dealsRequestId = useRef(0);
  const [items, setItems] = useState<QuoteItemInput[]>(
    initialItems && initialItems.length > 0 ? initialItems : [emptyLine(catalog)],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [companyQuery, setCompanyQuery] = useState("");
  const [contactQuery, setContactQuery] = useState("");
  const [leadQuery, setLeadQuery] = useState("");

  const company = companyList.find((row) => row.id === companyId);
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

  function handleCreatedCustomer(result: {
    company: QuoteFormCompany;
    contact: QuoteFormContact | null;
    deal: QuoteFormDeal | null;
  }) {
    setCompanyList((list) =>
      list.some((row) => row.id === result.company.id)
        ? list
        : [...list, result.company].sort((a, b) =>
            a.name.localeCompare(b.name, "nl"),
          ),
    );
    applySelection(
      {
        companyId: result.company.id,
        contactId: result.contact?.id ?? "",
      },
      {
        contacts: result.contact ? [result.contact] : [],
      },
    );
    if (result.deal) {
      const createdDeal = result.deal;
      setVisibleDeals((list) =>
        list.some((row) => row.id === createdDeal.id)
          ? list
          : [createdDeal, ...list],
      );
      setDealId(createdDeal.id);
      return;
    }
    loadDeals(result.company.id);
  }

  function handleCreatedContact(contact: QuoteFormContact) {
    applySelection(
      { companyId, contactId: contact.id },
      { contacts: [...visibleContacts, contact] },
    );
  }

  function handleCreatedLead(deal: QuoteFormDeal) {
    setVisibleDeals((list) =>
      list.some((row) => row.id === deal.id) ? list : [deal, ...list],
    );
    setDealId(deal.id);
  }

  const companyItems = useMemo(
    () => [
      { value: "", label: "Kies een klant" },
      ...companyList.map((row) => ({ value: row.id, label: row.name })),
    ],
    [companyList],
  );
  const contactItems = useMemo(
    () => [
      { value: "", label: "Geen contactpersoon" },
      ...visibleContacts.map((contact) => ({
        value: contact.id,
        label: formatPersonName(contact.firstName, contact.lastName),
      })),
    ],
    [visibleContacts],
  );
  const dealItems = useMemo(
    () => [
      { value: "", label: "Geen lead gekoppeld" },
      ...visibleDeals.map((deal) => ({
        value: deal.id,
        label: deal.title,
      })),
    ],
    [visibleDeals],
  );

  return (
    <div className="flex flex-col" data-configurator-page="">
    <form action={formAction} className="flex flex-col">
      {quoteId ? <input type="hidden" name="id" value={quoteId} /> : null}
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <div className="flex flex-col max-lg:pb-[var(--configurator-bar-space)]">
      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="flex items-end gap-2">
          <FormField id="companyId" label="Klant" className="min-w-0 flex-1">
            <ComboboxMenu
              required
              value={companyId}
              onValueChange={handleCompanyChange}
              items={companyItems}
              placeholder="Kies een klant"
              searchPlaceholder="Zoek een klant…"
              createLabel="Nieuw bedrijf"
              onCreate={(query) => {
                setCompanyQuery(query);
                setCompanyDialogOpen(true);
              }}
            />
          </FormField>
          <Button
            type="button"
            variant="secondary"
            aria-label="Nieuw bedrijf"
            onClick={() => setCompanyDialogOpen(true)}
          >
            Nieuw
          </Button>
        </div>
        <div className="flex items-end gap-2">
          <FormField id="contactId" label="Contactpersoon" className="min-w-0 flex-1">
            <ComboboxMenu
              value={contactId}
              disabled={contactsLoading}
              onValueChange={handleContactChange}
              items={contactItems}
              placeholder="Geen contactpersoon"
              searchPlaceholder="Zoek een contact…"
              createLabel="Nieuw contact"
              createDisabled={!companyId}
              onCreate={(query) => {
                if (!companyId) return;
                setContactQuery(query);
                setContactDialogOpen(true);
              }}
            />
          </FormField>
          <Button
            type="button"
            variant="secondary"
            disabled={!companyId}
            aria-label="Nieuw contact"
            onClick={() => {
              if (!companyId) return;
              setContactDialogOpen(true);
            }}
          >
            Nieuw
          </Button>
        </div>
        <div className="flex items-end gap-2">
          <FormField id="dealId" label="Lead" className="min-w-0 flex-1">
            <ComboboxMenu
              value={dealId}
              disabled={dealsLoading}
              onValueChange={setDealId}
              items={dealItems}
              placeholder="Geen lead gekoppeld"
              searchPlaceholder="Zoek een lead…"
              createLabel="Nieuwe lead"
              createDisabled={!companyId}
              onCreate={(query) => {
                if (!companyId) return;
                setLeadQuery(query || company?.name || "");
                setLeadDialogOpen(true);
              }}
            />
          </FormField>
          <Button
            type="button"
            variant="secondary"
            disabled={!companyId}
            aria-label="Nieuwe lead"
            onClick={() => {
              if (!companyId) return;
              setLeadQuery(company?.name || "");
              setLeadDialogOpen(true);
            }}
          >
            Nieuw
          </Button>
        </div>
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
    <CreateCustomerDialog
      showTrigger={false}
      open={companyDialogOpen}
      onOpenChange={(next) => {
        setCompanyDialogOpen(next);
        if (!next) setCompanyQuery("");
      }}
      defaultName={companyQuery}
      onCreated={handleCreatedCustomer}
    />
    <CreateQuoteContactDialog
      showTrigger={false}
      companyId={companyId}
      open={contactDialogOpen}
      onOpenChange={(next) => {
        setContactDialogOpen(next);
        if (!next) setContactQuery("");
      }}
      defaultFirstName={contactQuery}
      onCreated={handleCreatedContact}
    />
    <CreateLeadDialog
      companyId={companyId}
      contactId={contactId}
      open={leadDialogOpen}
      onOpenChange={(next) => {
        setLeadDialogOpen(next);
        if (!next) setLeadQuery("");
      }}
      defaultTitle={leadQuery || company?.name}
      onCreated={handleCreatedLead}
    />
    </div>
  );
}
