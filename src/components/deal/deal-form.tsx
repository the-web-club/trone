"use client";

import { useId, useMemo, useState } from "react";
import { useCompanyContactFields } from "@/components/contact/use-company-contact-fields";
import { CreateCompanyDialog } from "@/components/company/create-company-dialog";
import { CreateQuoteContactDialog } from "@/components/quote/create-contact-dialog";
import { Button } from "@/components/ui/button";
import { ComboboxMenu } from "@/components/ui/combobox";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
import { FormField, FormFieldGrid } from "@/components/ui/form-field";
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
  onCreated,
  onNestedOpenChange,
}: {
  deal?: DealFormValues;
  stages: DealFormOption[];
  sources: DealFormOption[];
  companies: DealFormOption[];
  contacts: DealFormContact[];
  action: (
    prev: { error?: string; deal?: { id: string; slug: string } } | null,
    formData: FormData,
  ) => Promise<{ error?: string; deal?: { id: string; slug: string } }>;
  submitLabel: string;
  onCreated?: (deal: { id: string; slug: string }) => void;
  onNestedOpenChange?: (open: boolean) => void;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
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

  function setNestedDialog(which: "company" | "contact", next: boolean) {
    if (which === "company") setCompanyDialogOpen(next);
    else setContactDialogOpen(next);
    onNestedOpenChange?.(
      which === "company" ? next || contactDialogOpen : next || companyDialogOpen,
    );
  }

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

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await action(null, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.deal) onCreated?.(result.deal);
  }

  return (
    <form action={onSubmit} className="flex min-h-0 flex-1 flex-col">
      {deal?.id ? <input type="hidden" name="id" value={deal.id} /> : null}
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="contactId" value={contactId} />

      <DialogBody className="flex flex-col gap-3">
        <FormFieldGrid>
          <FormField id={`${id}-title`} label="Titel" className="col-span-2">
            <Input
              name="title"
              required
              autoFocus
              defaultValue={deal?.title ?? ""}
            />
          </FormField>

          <FormField id={`${id}-companyId`} label="Bedrijf">
            <ComboboxMenu
              value={companyId}
              onValueChange={(next) => onCompanyChange(next)}
              items={companyItems}
              placeholder="Geen bedrijf gekoppeld"
              searchPlaceholder="Zoek een bedrijf…"
              createLabel="Nieuw bedrijf"
              wrap
              onCreate={(query) => {
                setCompanyQuery(query);
                setNestedDialog("company", true);
              }}
            />
          </FormField>
          <FormField id={`${id}-contactId`} label="Contact">
            <ComboboxMenu
              value={contactId}
              disabled={contactsLoading}
              onValueChange={(next) => onContactChange(next)}
              items={contactItems}
              placeholder="Geen contactpersoon"
              searchPlaceholder="Zoek een contact…"
              createLabel="Nieuw contact"
              createDisabled={!companyId}
              wrap
              onCreate={(query) => {
                if (!companyId) return;
                setContactQuery(query);
                setNestedDialog("contact", true);
              }}
            />
          </FormField>
          <FormField id={`${id}-stageId`} label="Fase">
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
          <FormField id={`${id}-sourceId`} label="Bron">
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
          <FormField id={`${id}-valueEstimate`} label="Waarde (€)" className="col-span-2">
            <Input
              name="valueEstimate"
              type="number"
              min="0"
              step="1"
              defaultValue={deal?.valueEstimate ?? ""}
            />
          </FormField>
        </FormFieldGrid>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
      </DialogFooter>

      <CreateCompanyDialog
        showTrigger={false}
        open={companyDialogOpen}
        onOpenChange={(next) => {
          setNestedDialog("company", next);
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
      <CreateQuoteContactDialog
        companyId={companyId}
        showTrigger={false}
        open={contactDialogOpen}
        onOpenChange={(next) => {
          setNestedDialog("contact", next);
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
    </form>
  );
}
