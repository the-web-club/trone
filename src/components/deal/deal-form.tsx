"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  const [companyId, setCompanyId] = useState(deal?.companyId ?? "");
  const [contactId, setContactId] = useState(deal?.contactId ?? "");

  const visibleContacts = useMemo(
    () =>
      contacts.filter(
        (contact) =>
          !companyId || !contact.companyId || contact.companyId === companyId,
      ),
    [companyId, contacts],
  );

  function onCompanyChange(nextCompanyId: string) {
    setCompanyId(nextCompanyId);
    const selected = contacts.find((contact) => contact.id === contactId);
    if (
      selected?.companyId &&
      nextCompanyId &&
      selected.companyId !== nextCompanyId
    ) {
      setContactId("");
    }
  }

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      {deal?.id ? <input type="hidden" name="id" value={deal.id} /> : null}

      <FormField id="title" label="Titel">
        <Input name="title" required defaultValue={deal?.title ?? ""} />
      </FormField>

      <FormField id="companyId" label="Bedrijf">
        <Select
          name="companyId"
          value={companyId}
          onChange={(event) => onCompanyChange(event.target.value)}
        >
          <option value="">Geen bedrijf gekoppeld</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField id="contactId" label="Contactpersoon">
        <Select
          name="contactId"
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

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="stageId" label="Fase">
          <Select name="stageId" required defaultValue={deal?.stageId ?? stages[0]?.id}>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="sourceId" label="Bron">
          <Select name="sourceId" defaultValue={deal?.sourceId ?? ""}>
            <option value="">Onbekend</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </Select>
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
