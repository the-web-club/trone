"use client";

import { useActionState } from "react";
import { updateLetterheadAction } from "@/app/(beveiligd)/actions/settings-actions";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { Letterhead } from "@/lib/letterhead";

export function LetterheadForm({
  letterhead,
  canManage,
}: {
  letterhead: Letterhead;
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateLetterheadAction,
    null,
  );

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-3">
      <FormField id="name" label="Bedrijfsnaam">
        <Input
          name="name"
          defaultValue={letterhead.name}
          disabled={!canManage}
          autoComplete="organization"
        />
      </FormField>

      <FormField id="addressLine" label="Adres">
        <Input
          name="addressLine"
          defaultValue={letterhead.addressLine}
          disabled={!canManage}
          autoComplete="street-address"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField id="postalCode" label="Postcode">
          <Input
            name="postalCode"
            defaultValue={letterhead.postalCode}
            disabled={!canManage}
            autoComplete="postal-code"
          />
        </FormField>
        <FormField id="city" label="Plaats">
          <Input
            name="city"
            defaultValue={letterhead.city}
            disabled={!canManage}
            autoComplete="address-level2"
          />
        </FormField>
      </div>

      <FormField id="country" label="Land">
        <Input
          name="country"
          defaultValue={letterhead.country}
          disabled={!canManage}
          autoComplete="country-name"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField id="cocNumber" label="KvK-nummer">
          <Input
            name="cocNumber"
            defaultValue={letterhead.cocNumber}
            disabled={!canManage}
            autoComplete="off"
          />
        </FormField>
        <FormField id="vatNumber" label="Btw-nummer">
          <Input
            name="vatNumber"
            defaultValue={letterhead.vatNumber}
            disabled={!canManage}
            autoComplete="off"
          />
        </FormField>
      </div>

      <FormField id="iban" label="IBAN">
        <Input
          name="iban"
          defaultValue={letterhead.iban}
          disabled={!canManage}
          autoComplete="off"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField id="phone" label="Telefoon">
          <Input
            name="phone"
            type="tel"
            defaultValue={letterhead.phone}
            disabled={!canManage}
            autoComplete="tel"
          />
        </FormField>
        <FormField id="email" label="E-mail">
          <Input
            name="email"
            type="email"
            defaultValue={letterhead.email}
            disabled={!canManage}
            autoComplete="email"
          />
        </FormField>
      </div>

      <FormField id="website" label="Website">
        <Input
          name="website"
          defaultValue={letterhead.website}
          disabled={!canManage}
          autoComplete="url"
        />
      </FormField>

      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {canManage ? (
        <div>
          <Button type="submit" loading={pending}>
            Opslaan
          </Button>
        </div>
      ) : (
        <p className="text-sm text-fg-muted">
          Alleen een beheerder kan de bedrijfsgegevens wijzigen.
        </p>
      )}
    </form>
  );
}
