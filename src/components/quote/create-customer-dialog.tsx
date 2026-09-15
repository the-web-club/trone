"use client";

import { useId, useState } from "react";
import { createComposerCustomerAction } from "@/app/(beveiligd)/actions/composer-customer-actions";
import type {
  ComposerCreatedCompany,
  ComposerCreatedContact,
  ComposerCreatedDeal,
} from "@/app/(beveiligd)/actions/composer-customer-actions";
import { LeadSubmitButton } from "@/components/deal/lead-submit-button";
import { FormStatus } from "@/components/form/form-status";
import { useFormSubmission } from "@/components/form/use-form-submission";
import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { CountrySelect } from "@/components/company/country-select";
import { Button } from "@/components/ui/button";
import { safeParseComposerCompanyForm } from "@/lib/company-validation";
import { LEAD_SAVE_UNCERTAIN_MESSAGE } from "@/lib/lead-submission";

export function CreateCustomerDialog({
  onCreated,
  open: openProp,
  onOpenChange,
  showTrigger = true,
  defaultName,
}: {
  onCreated: (result: {
    company: ComposerCreatedCompany;
    contact: ComposerCreatedContact | null;
    deal: ComposerCreatedDeal | null;
  }) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  defaultName?: string;
}) {
  const id = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const form = useFormSubmission({
    pendingLabel: "Bezig met opslaan…",
    successLabel: "Toegevoegd",
  });
  const open = openProp ?? uncontrolledOpen;

  function setOpen(next: boolean) {
    form.handleOpenChange(next, (value) => {
      if (openProp === undefined) setUncontrolledOpen(value);
      onOpenChange?.(value);
    });
  }

  async function onSubmit(formData: FormData) {
    await form.submit({
      formData,
      fieldOrder: ["companyName", "companyEmail", "firstName", "contactEmail"],
      fieldElementId: (name) => `${id}-${name}`,
      uncertainMessage: LEAD_SAVE_UNCERTAIN_MESSAGE,
      validate: safeParseComposerCompanyForm,
      save: async (data) => {
        const saved = await createComposerCustomerAction(data);
        if ("error" in saved && saved.error) {
          return { error: saved.error };
        }
        if ("company" in saved) return { result: saved };
        return { error: "Er ging iets mis. Probeer het opnieuw." };
      },
      onSuccess: (created) => {
        onCreated(created);
        setOpen(false);
      },
    });
  }

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger
          render={
            <Button type="button" variant="secondary" aria-label="Nieuw bedrijf">
              Nieuw
            </Button>
          }
        />
      ) : null}
      <DialogContent size="md">
        <DialogHeader dismissible={form.status !== "submitting"}>
          <DialogTitle>Nieuwe klant</DialogTitle>
          <p className="text-sm text-fg-muted">
            Voor een telefonische intake. Contact en lead zijn optioneel.
          </p>
        </DialogHeader>
        <form action={onSubmit} noValidate>
          <input type="hidden" name="submissionId" value={form.submissionId} />
          <DialogBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <p className="text-label font-medium tracking-wide text-fg-muted uppercase">
                Bedrijf
              </p>
              <FormField
                id={`${id}-companyName`}
                label="Naam"
                error={form.shownErrors.companyName}
              >
                <Input
                  name="companyName"
                  autoComplete="organization"
                  defaultValue={defaultName ?? ""}
                  onBlur={() => form.markTouched("companyName")}
                />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id={`${id}-companyPhone`} label="Telefoon">
                  <Input name="companyPhone" type="tel" autoComplete="tel" />
                </FormField>
                <FormField
                  id={`${id}-companyEmail`}
                  label="E-mailadres"
                  error={form.shownErrors.companyEmail}
                >
                  <Input
                    name="companyEmail"
                    type="email"
                    autoComplete="email"
                    onBlur={() => form.markTouched("companyEmail")}
                  />
                </FormField>
              </div>
              <FormField id={`${id}-companyCountry`} label="Land">
                <CountrySelect name="companyCountry" defaultValue="NL" />
              </FormField>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-label font-medium tracking-wide text-fg-muted uppercase">
                Contactpersoon
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id={`${id}-firstName`} label="Voornaam">
                  <Input name="firstName" autoComplete="given-name" />
                </FormField>
                <FormField id={`${id}-lastName`} label="Achternaam">
                  <Input name="lastName" autoComplete="family-name" />
                </FormField>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id={`${id}-contactPhone`} label="Telefoon">
                  <Input name="contactPhone" type="tel" autoComplete="tel" />
                </FormField>
                <FormField id={`${id}-contactEmail`} label="E-mailadres">
                  <Input
                    name="contactEmail"
                    type="email"
                    autoComplete="email"
                  />
                </FormField>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                name="createLead"
                defaultChecked
                className="size-3.5 rounded-xs border-border accent-fg"
              />
              Ook een lead in de pijplijn zetten
            </label>

            <FormStatus error={form.error} statusMessage={form.statusMessage} />
          </DialogBody>
          <DialogFooter>
            <LeadSubmitButton readyLabel="Toevoegen" status={form.status} />
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
