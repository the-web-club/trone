"use client";

import { useActionState, useMemo, useState } from "react";
import { useCompanyContactFields } from "@/components/contact/use-company-contact-fields";
import { CreateCompanyDialog } from "@/components/company/create-company-dialog";
import { CreateQuoteContactDialog } from "@/components/quote/create-contact-dialog";
import { Button } from "@/components/ui/button";
import { ComboboxMenu } from "@/components/ui/combobox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select";
import { formatPersonName } from "@/lib/format";

export type DealFormOption = { id: string; name: string };

export type DealFormContact = {
  id: string;
  firstName: string;
  lastName: string | null;
  companyId: string | null;
};

export type DealFormValues = {
  id?: string;
  title: string;
  companyId?: string | null;
  contactId?: string | null;
  stageId: string;
  sourceId?: string | null;
  valueEstimate?: number | null;
};

export function DealForm({
  deal,
  stages,
  sources,
  companies,
  contacts,
  action,
  submitLabel,
}: {
  deal?: DealFormValues;
  stages: DealFormOption[];
  sources: DealFormOption[];
  companies: DealFormOption[];
  contacts: DealFormContact[];
  action: (
    prev: { error?: string } | null,
    formData: FormData,
  ) => Promise<{ error?: string }>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const {
    companyId,
    contactId,
    contacts: visibleContacts,
    contactsLoading,
    onCompanyChange,
    onContactChange,
    applySelection,
  } = useCompanyContactFields({
    initialCompanyId: deal?.companyId,
    initialContactId: deal?.contactId,
    initialContacts: contacts,
  });
  const [companyList, setCompanyList] = useState(companies);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [companyQuery, setCompanyQuery] = useState("");
  const [contactQuery, setContactQuery] = useState("");

  const companyItems = useMemo(
    () => [
      { value: "", label: "Geen bedrijf gekoppeld" },
      ...companyList.map((company) => ({
        value: company.id,
        label: company.name,
      })),
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

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      {deal?.id ? <input type="hidden" name="id" value={deal.id} /> : null}
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="contactId" value={contactId} />

      <FormField id="title" label="Titel">
        <Input name="title" required defaultValue={deal?.title ?? ""} />
      </FormField>

      <div className="flex items-end gap-2">
        <FormField id="companyId" label="Bedrijf" className="min-w-0 flex-1">
          <ComboboxMenu
            value={companyId}
            onValueChange={(next) => onCompanyChange(next)}
            items={companyItems}
            placeholder="Geen bedrijf gekoppeld"
            searchPlaceholder="Zoek een bedrijf…"
            createLabel="Nieuw bedrijf"
            onCreate={(query) => {
              setCompanyQuery(query);
              setCompanyDialogOpen(true);
            }}
          />
        </FormField>
        <CreateCompanyDialog
          open={companyDialogOpen}
          onOpenChange={(next) => {
            setCompanyDialogOpen(next);
            if (!next) setCompanyQuery("");
          }}
          defaultName={companyQuery}
          onCreated={(created) => {
            setCompanyList((list) =>
              list.some((row) => row.id === created.id)
                ? list
                : [...list, { id: created.id, name: created.name }].sort(
                    (a, b) => a.name.localeCompare(b.name, "nl"),
                  ),
            );
            onCompanyChange(created.id);
          }}
        />
      </div>

      <div className="flex items-end gap-2">
        <FormField id="contactId" label="Contactpersoon" className="min-w-0 flex-1">
          <ComboboxMenu
            value={contactId}
            disabled={contactsLoading}
            onValueChange={(next) => onContactChange(next)}
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
        <CreateQuoteContactDialog
          companyId={companyId}
          open={contactDialogOpen}
          onOpenChange={(next) => {
            setContactDialogOpen(next);
            if (!next) setContactQuery("");
          }}
          defaultFirstName={contactQuery}
          onCreated={(contact) => {
            applySelection(
              { companyId, contactId: contact.id },
              { contacts: [...visibleContacts, contact] },
            );
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="stageId" label="Fase">
          <SelectMenu
            name="stageId"
            required
            defaultValue={deal?.stageId ?? stages[0]?.id}
            items={stages.map((stage) => ({
              value: stage.id,
              label: stage.name,
            }))}
            searchPlaceholder="Zoek een fase…"
          />
        </FormField>
        <FormField id="sourceId" label="Bron">
          <SelectMenu
            name="sourceId"
            defaultValue={deal?.sourceId ?? ""}
            items={[
              { value: "", label: "Onbekend" },
              ...sources.map((source) => ({
                value: source.id,
                label: source.name,
              })),
            ]}
            searchPlaceholder="Zoek een bron…"
          />
        </FormField>
      </div>

      <FormField id="valueEstimate" label="Geschatte waarde (€)">
        <Input
          name="valueEstimate"
          type="number"
          min="0"
          step="1"
          defaultValue={deal?.valueEstimate ?? ""}
        />
      </FormField>

      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
