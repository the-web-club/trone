"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CountrySelect } from "@/components/company/country-select";
import { VatValidateControls } from "@/components/company/vat-validate-controls";
import { VatTreatmentNotice } from "@/components/vat/vat-treatment-notice";
import { resolveVatTreatment, viesStatusFromCache } from "@/lib/vat";

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
}: {
  company?: CompanyFormValues;
  action: (
    prev: { error?: string; company?: { id: string; slug: string } } | null,
    formData: FormData,
  ) => Promise<{ error?: string; company?: { id: string; slug: string } }>;
  submitLabel: string;
  onCreated?: (company: { id: string; slug: string }) => void;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [country, setCountry] = useState(company?.country ?? "NL");
  const [vatNumber, setVatNumber] = useState(company?.vatNumber ?? "");
  const vies = viesStatusFromCache({
    country,
    vatNumber,
    viesValid: company?.viesValid,
    viesValidatedAt: company?.viesValidatedAt,
  });
  const treatment = resolveVatTreatment(country, vies.status);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await action(null, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.company) onCreated?.(result.company);
  }

  return (
    <form action={onSubmit} className="flex min-h-0 flex-1 flex-col">
      {company?.id ? <input type="hidden" name="id" value={company.id} /> : null}

      <DialogBody className="flex flex-col gap-3">
        <FormField id={`${id}-name`} label="Naam">
          <Input
            name="name"
            required
            autoFocus
            defaultValue={company?.name ?? ""}
            autoComplete="organization"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField id={`${id}-email`} label="E-mailadres">
            <Input
              name="email"
              type="email"
              defaultValue={company?.email ?? ""}
              autoComplete="email"
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

        <FormField id={`${id}-country`} label="Land">
          <CountrySelect
            name="country"
            value={country}
            onValueChange={setCountry}
            required
          />
        </FormField>

        <FormField id={`${id}-vatRate`} label="Btw-tarief (%)">
          <Input
            name="vatRate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={company?.vatRate ?? 21}
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
    </form>
  );
}
