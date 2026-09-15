"use client";

import { useId, useState } from "react";
import { createCompanyInlineAction } from "@/app/(beveiligd)/actions/company-actions";
import type { CreatedCompanyOption } from "@/app/(beveiligd)/actions/company-actions";
import { FormStatus } from "@/components/form/form-status";
import { useFormSubmission } from "@/components/form/use-form-submission";
import { Button } from "@/components/ui/button";
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
import { SubmitStatusButton } from "@/components/ui/submit-status-button";
import { CountrySelect } from "@/components/company/country-select";
import { safeParseComposerCompanyForm } from "@/lib/company-validation";

export function CreateCompanyDialog({
  onCreated,
  open: openProp,
  onOpenChange,
  showTrigger = true,
  defaultName,
}: {
  onCreated: (company: CreatedCompanyOption) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  defaultName?: string;
}) {
  const id = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const form = useFormSubmission({
    pendingLabel: "Toevoegen…",
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
      fieldOrder: ["companyName", "companyEmail", "companyPhone", "companyCountry"],
      fieldElementId: (name) => `${id}-${name}`,
      validate: safeParseComposerCompanyForm,
      save: async (data) => {
        const saved = await createCompanyInlineAction(data);
        if (saved.error) {
          return { error: saved.error, fieldErrors: saved.fieldErrors };
        }
        if (saved.company) return { result: saved.company };
        return { error: "Er ging iets mis. Probeer het opnieuw." };
      },
      onSuccess: (company) => {
        onCreated(company);
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
          <DialogTitle>Nieuw bedrijf</DialogTitle>
        </DialogHeader>
        <form
          action={onSubmit}
          noValidate
          key={form.submissionId}
        >
          <input type="hidden" name="submissionId" value={form.submissionId} />
          <DialogBody className="flex flex-col gap-3">
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
            <FormStatus error={form.error} statusMessage={form.statusMessage} />
          </DialogBody>
          <DialogFooter>
            <SubmitStatusButton
              readyLabel="Toevoegen"
              pendingLabel="Toevoegen…"
              successLabel="Toegevoegd"
              status={form.status}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
