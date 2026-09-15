"use client";

import { useEffect, useId, useState } from "react";
import type { CreatedCompanyOption } from "@/app/(beveiligd)/actions/company-actions";
import { FormStatus } from "@/components/form/form-status";
import { useFormSubmission } from "@/components/form/use-form-submission";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitStatusButton } from "@/components/ui/submit-status-button";
import { CountrySelect } from "@/components/company/country-select";
import { VatValidateControls } from "@/components/company/vat-validate-controls";
import { VatTreatmentNotice } from "@/components/vat/vat-treatment-notice";
import { safeParseCompanyForm } from "@/lib/company-validation";
import { resolveVatTreatment, viesStatusFromCache } from "@/lib/vat";

type CompanyFormActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  company?: CreatedCompanyOption;
};

export type CompanyFormValues = {
  id?: string;
  name: string;
  email?: string | null;
  vatNumber?: string | null;
  cocNumber?: string | null;
  website?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country: string;
  vatRate: number;
  viesValid?: boolean | null;
  viesValidatedAt?: Date | string | null;
  viesCheckedName?: string | null;
  notes?: string | null;
};

export function CompanyForm({
  company,
  action,
  submitLabel,
  onCreated,
  onBusyChange,
}: {
  company?: CompanyFormValues;
  action: (
    prev: CompanyFormActionState | null,
    formData: FormData,
  ) => Promise<CompanyFormActionState>;
  submitLabel: string;
  onCreated?: (company: CreatedCompanyOption) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const id = useId();
  const form = useFormSubmission({
    pendingLabel: "Opslaan…",
    successLabel: "Opgeslagen",
  });
  const [country, setCountry] = useState(company?.country ?? "NL");
  const [vatNumber, setVatNumber] = useState(company?.vatNumber ?? "");
  const vies = viesStatusFromCache({
    country,
    vatNumber,
    viesValid: company?.viesValid,
    viesValidatedAt: company?.viesValidatedAt,
  });
  const treatment = resolveVatTreatment(country, vies.status);

  useEffect(() => {
    onBusyChange?.(form.status === "submitting");
  }, [form.status, onBusyChange]);

  async function onSubmit(formData: FormData) {
    await form.submit({
      formData,
      fieldOrder: ["name", "email", "vatNumber", "country", "vatRate"],
      fieldElementId: (name) => `${id}-${name}`,
      validate: safeParseCompanyForm,
      save: async (data) => {
        const saved = await action(null, data);
        if (saved.error) {
          return { error: saved.error, fieldErrors: saved.fieldErrors };
        }
        if (saved.company) return { result: saved.company };
        if (company?.id) return { result: { id: company.id, slug: "", name: company.name } };
        return { error: "Er ging iets mis. Probeer het opnieuw." };
      },
      onSuccess: (created) => {
        if (created.id) onCreated?.(created);
      },
    });
  }

  return (
    <form
      action={onSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      key={form.submissionId}
    >
      {company?.id ? <input type="hidden" name="id" value={company.id} /> : null}
      {!company?.id ? (
        <input type="hidden" name="submissionId" value={form.submissionId} />
      ) : null}

      <DialogBody className="flex flex-col gap-3">
        <FormField id={`${id}-name`} label="Naam" error={form.shownErrors.name}>
          <Input
            name="name"
            autoFocus
            defaultValue={company?.name ?? ""}
            autoComplete="organization"
            onBlur={() => form.markTouched("name")}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            id={`${id}-email`}
            label="E-mailadres"
            error={form.shownErrors.email}
          >
            <Input
              name="email"
              type="email"
              defaultValue={company?.email ?? ""}
              autoComplete="email"
              onBlur={() => form.markTouched("email")}
            />
          </FormField>
          <FormField id={`${id}-phone`} label="Telefoon">
            <Input
              name="phone"
              type="tel"
              defaultValue={company?.phone ?? ""}
              autoComplete="tel"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField id={`${id}-vatNumber`} label="Btw-nummer">
            <Input
              name="vatNumber"
              defaultValue={company?.vatNumber ?? ""}
              autoComplete="off"
              placeholder="Inclusief landcode, bv. FI12345678"
              onChange={(event) => setVatNumber(event.target.value)}
            />
          </FormField>
          <FormField id={`${id}-cocNumber`} label="Registratienummer">
            <Input
              name="cocNumber"
              defaultValue={company?.cocNumber ?? ""}
              autoComplete="off"
              placeholder="KvK, Y-tunnus, Companies House…"
            />
          </FormField>
        </div>
        {company?.id ? (
          <VatValidateControls
            companyId={company.id}
            vatNumber={vatNumber}
            country={country}
            initialStatus={company.viesValid}
            initialName={company.viesCheckedName}
            initialCheckedAt={company.viesValidatedAt}
          />
        ) : null}

        <FormField id={`${id}-website`} label="Website">
          <Input
            name="website"
            defaultValue={company?.website ?? ""}
            autoComplete="url"
          />
        </FormField>

        <FormField id={`${id}-addressLine`} label="Adres">
          <Input
            name="addressLine"
            defaultValue={company?.addressLine ?? ""}
            autoComplete="street-address"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField id={`${id}-postalCode`} label="Postcode">
            <Input
              name="postalCode"
              defaultValue={company?.postalCode ?? ""}
              autoComplete="postal-code"
            />
          </FormField>
          <FormField id={`${id}-city`} label="Plaats">
            <Input
              name="city"
              defaultValue={company?.city ?? ""}
              autoComplete="address-level2"
            />
          </FormField>
        </div>

        <FormField id={`${id}-country`} label="Land" error={form.shownErrors.country}>
          <CountrySelect
            name="country"
            value={country}
            onValueChange={setCountry}
            required
          />
        </FormField>

        <FormField
          id={`${id}-vatRate`}
          label="Btw-tarief (%)"
          error={form.shownErrors.vatRate}
        >
          <Input
            name="vatRate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={company?.vatRate ?? 21}
            onBlur={() => form.markTouched("vatRate")}
          />
        </FormField>
        <VatTreatmentNotice
          vatRate={treatment.vatRate}
          vatRegime={treatment.vatRegime}
          warning={treatment.warning}
          stale={vies.stale}
        />
        <p className="text-xs text-fg-muted">
          Offertes en facturen bepalen het tarief via land + VIES, niet via dit veld alleen.
        </p>

        <FormField id={`${id}-notes`} label="Notities">
          <Textarea name="notes" defaultValue={company?.notes ?? ""} />
        </FormField>

        <FormStatus error={form.error} statusMessage={form.statusMessage} />
      </DialogBody>
      <DialogFooter>
        <SubmitStatusButton readyLabel={submitLabel} status={form.status} />
      </DialogFooter>
    </form>
  );
}
