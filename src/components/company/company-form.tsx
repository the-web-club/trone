"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  notes?: string | null;
};

export function CompanyForm({
  company,
  action,
  submitLabel,
}: {
  company?: CompanyFormValues;
  action: (
    prev: { error?: string } | null,
    formData: FormData,
  ) => Promise<{ error?: string }>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      {company?.id ? <input type="hidden" name="id" value={company.id} /> : null}

      <FormField id="name" label="Naam">
        <Input name="name" required defaultValue={company?.name ?? ""} autoComplete="organization" />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="email" label="E-mailadres">
          <Input name="email" type="email" defaultValue={company?.email ?? ""} autoComplete="email" />
        </FormField>
        <FormField id="phone" label="Telefoon">
          <Input name="phone" type="tel" defaultValue={company?.phone ?? ""} autoComplete="tel" />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="vatNumber" label="Btw-nummer">
          <Input name="vatNumber" defaultValue={company?.vatNumber ?? ""} />
        </FormField>
        <FormField id="cocNumber" label="KvK-nummer">
          <Input name="cocNumber" defaultValue={company?.cocNumber ?? ""} />
        </FormField>
      </div>

      <FormField id="website" label="Website">
        <Input name="website" defaultValue={company?.website ?? ""} />
      </FormField>

      <FormField id="addressLine" label="Adres">
        <Input name="addressLine" defaultValue={company?.addressLine ?? ""} autoComplete="street-address" />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id="postalCode" label="Postcode">
          <Input name="postalCode" defaultValue={company?.postalCode ?? ""} autoComplete="postal-code" />
        </FormField>
        <FormField id="city" label="Plaats">
          <Input name="city" defaultValue={company?.city ?? ""} autoComplete="address-level2" />
        </FormField>
        <FormField id="country" label="Land">
          <Input name="country" defaultValue={company?.country ?? "NL"} maxLength={2} />
        </FormField>
      </div>

      <FormField id="vatRate" label="Btw-tarief (%)">
        <Input
          name="vatRate"
          type="number"
          step="0.01"
          min="0"
          max="100"
          defaultValue={company?.vatRate ?? 21}
        />
      </FormField>

      <FormField id="notes" label="Notities">
        <Textarea name="notes" defaultValue={company?.notes ?? ""} />
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
