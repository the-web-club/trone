"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useCompanyContactFields } from "@/components/contact/use-company-contact-fields";
import { CreateCompanyDialog } from "@/components/company/create-company-dialog";
import { LeadSubmitButton } from "@/components/deal/lead-submit-button";
import { CreateQuoteContactDialog } from "@/components/quote/create-contact-dialog";
import { ComboboxMenu } from "@/components/ui/combobox";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
import { FormField, FormFieldGrid } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select";
import {
  firstInvalidDealField,
  safeParseDealForm,
  type DealFieldErrors,
  type DealFieldName,
} from "@/lib/deal-validation";
import { formatPersonName } from "@/lib/format";
import {
  createSubmissionGuard,
  createSubmissionId,
  submitLeadCreation,
  visibleDealFieldErrors,
} from "@/lib/lead-submission";

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
    prev: {
      error?: string;
      fieldErrors?: Record<string, string>;
      deal?: { id: string; slug: string };
    } | null,
    formData: FormData,
  ) => Promise<{
    error?: string;
    fieldErrors?: Record<string, string>;
    deal?: { id: string; slug: string };
  }>;
  submitLabel: string;
  onCreated?: (deal: { id: string; slug: string }) => void;
  onNestedOpenChange?: (open: boolean) => void;
}) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const guard = useRef(createSubmissionGuard()).current;
  const [submissionId] = useState(createSubmissionId);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<DealFieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<DealFieldName, boolean>>>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">(
    "idle",
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

  const shownErrors = visibleDealFieldErrors(fieldErrors, touched, submitted);

  function markTouched(name: DealFieldName) {
    setTouched((current) => ({ ...current, [name]: true }));
  }

  function syncFieldErrors(form: HTMLFormElement) {
    const parsed = safeParseDealForm(new FormData(form));
    setFieldErrors(parsed.success ? {} : parsed.fieldErrors);
    if (parsed.success) setError(null);
  }

  function focusField(name: DealFieldName) {
    document.getElementById(`${id}-${name}`)?.focus();
  }

  async function onSubmit(formData: FormData) {
    const result = await submitLeadCreation({
      guard,
      formData,
      validate: (data) => {
        const parsed = safeParseDealForm(data);
        return parsed.success
          ? { success: true }
          : {
              success: false,
              fieldErrors: parsed.fieldErrors,
              formError: parsed.formError,
            };
      },
      save: (data) => action(null, data),
      onStart: () => {
        setStatus("submitting");
        setError(null);
      },
    });

    if (result.status === "ignored") return;

    if (result.status === "invalid") {
      setSubmitted(true);
      setStatus("idle");
      setFieldErrors(result.fieldErrors);
      setError(result.formError);
      const first = firstInvalidDealField(result.fieldErrors);
      if (first) focusField(first);
      return;
    }

    if (result.status === "failed") {
      setSubmitted(true);
      setStatus("idle");
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      setError(result.error);
      const first = firstInvalidDealField(result.fieldErrors ?? {});
      if (first) focusField(first);
      return;
    }

    if (result.status === "uncertain") {
      setStatus("idle");
      setError(result.error);
      return;
    }

    setError(null);
    setFieldErrors({});
    setStatus("success");
    onCreated?.(result.deal);
  }

  const statusMessage =
    status === "submitting"
      ? "Bezig met opslaan…"
      : status === "success"
        ? "Lead toegevoegd"
        : error;

  return (
    <form
      ref={formRef}
      action={onSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      {deal?.id ? <input type="hidden" name="id" value={deal.id} /> : null}
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="contactId" value={contactId} />

      <DialogBody className="flex flex-col gap-3">
        <FormFieldGrid>
          <FormField
            id={`${id}-title`}
            label="Titel"
            className="col-span-2"
            error={shownErrors.title}
          >
            <Input
              name="title"
              autoFocus
              defaultValue={deal?.title ?? ""}
              onBlur={(event) => {
                markTouched("title");
                const form = event.currentTarget.form ?? formRef.current;
                if (form) syncFieldErrors(form);
              }}
              onChange={(event) => {
                if (submitted || touched.title) {
                  const form = event.currentTarget.form ?? formRef.current;
                  if (form) syncFieldErrors(form);
                }
              }}
            />
          </FormField>

          <FormField id={`${id}-companyId`} label="Bedrijf" error={shownErrors.companyId}>
            <ComboboxMenu
              value={companyId}
              onValueChange={(next) => {
                onCompanyChange(next);
                markTouched("companyId");
              }}
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
          <FormField id={`${id}-contactId`} label="Contact" error={shownErrors.contactId}>
            <ComboboxMenu
              value={contactId}
              disabled={contactsLoading}
              onValueChange={(next) => {
                onContactChange(next);
                markTouched("contactId");
              }}
              items={contactItems}
              placeholder="Geen contactpersoon"
              searchPlaceholder="Zoek een contact…"
              createLabel="Nieuw contact"
              wrap
              onCreate={(query) => {
                setContactQuery(query);
                setNestedDialog("contact", true);
              }}
            />
          </FormField>
          <FormField id={`${id}-stageId`} label="Fase" error={shownErrors.stageId}>
            <SelectMenu
              name="stageId"
              defaultValue={deal?.stageId ?? stages[0]?.id}
              items={stages.map((stage) => ({
                value: stage.id,
                label: stage.name,
              }))}
              searchPlaceholder="Zoek een fase…"
              onValueChange={() => markTouched("stageId")}
            />
          </FormField>
          <FormField id={`${id}-sourceId`} label="Bron" error={shownErrors.sourceId}>
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
              onValueChange={() => markTouched("sourceId")}
            />
          </FormField>
          <FormField
            id={`${id}-valueEstimate`}
            label="Waarde (€)"
            className="col-span-2"
            error={shownErrors.valueEstimate}
          >
            <Input
              name="valueEstimate"
              type="number"
              min="0"
              step="1"
              defaultValue={deal?.valueEstimate ?? ""}
              onBlur={(event) => {
                markTouched("valueEstimate");
                const form = event.currentTarget.form ?? formRef.current;
                if (form) syncFieldErrors(form);
              }}
              onChange={(event) => {
                if (submitted || touched.valueEstimate) {
                  const form = event.currentTarget.form ?? formRef.current;
                  if (form) syncFieldErrors(form);
                }
              }}
            />
          </FormField>
        </FormFieldGrid>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {statusMessage}
        </p>
      </DialogBody>
      <DialogFooter>
        <LeadSubmitButton readyLabel={submitLabel} status={status} />
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
            {
              companyId: contact.companyId ?? companyId,
              contactId: contact.id,
            },
            { contacts: [...visibleContacts, contact] },
          );
        }}
      />
    </form>
  );
}
