"use client";

import { useId, useState } from "react";
import { createContactAction } from "@/app/(beveiligd)/actions/contact-actions";
import type { ComposerCreatedContact } from "@/app/(beveiligd)/actions/composer-customer-actions";
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
import { safeParseContactForm } from "@/lib/contact-validation";

export function CreateQuoteContactDialog({
  companyId,
  onCreated,
  open: openProp,
  onOpenChange,
  showTrigger = true,
  defaultFirstName,
}: {
  companyId: string;
  onCreated: (contact: ComposerCreatedContact) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  defaultFirstName?: string;
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
      fieldOrder: ["firstName", "lastName", "phone", "email"],
      fieldElementId: (name) => `${id}-${name}`,
      validate: safeParseContactForm,
      save: async (data) => {
        const saved = await createContactAction(null, data);
        if (saved.error) {
          return { error: saved.error, fieldErrors: saved.fieldErrors };
        }
        if (saved.contact) return { result: saved.contact };
        return { error: "Er ging iets mis. Probeer het opnieuw." };
      },
      onSuccess: (contact) => {
        onCreated(contact);
        setOpen(false);
      },
    });
  }

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="secondary"
              aria-label="Nieuw contact"
            >
              Nieuw
            </Button>
          }
        />
      ) : null}
      <DialogContent size="md">
        <DialogHeader dismissible={form.status !== "submitting"}>
          <DialogTitle>Nieuw contact</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} noValidate key={form.submissionId}>
          <input type="hidden" name="submissionId" value={form.submissionId} />
          <input type="hidden" name="companyId" value={companyId} />
          {companyId ? (
            <input type="hidden" name="isPrimary" value="on" />
          ) : null}
          <DialogBody className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                id={`${id}-firstName`}
                label="Voornaam"
                error={form.shownErrors.firstName}
              >
                <Input
                  name="firstName"
                  autoComplete="given-name"
                  defaultValue={defaultFirstName ?? ""}
                  onBlur={() => form.markTouched("firstName")}
                />
              </FormField>
              <FormField id={`${id}-lastName`} label="Achternaam">
                <Input name="lastName" autoComplete="family-name" />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id={`${id}-phone`} label="Telefoon">
                <Input name="phone" type="tel" autoComplete="tel" />
              </FormField>
              <FormField
                id={`${id}-email`}
                label="E-mailadres"
                error={form.shownErrors.email}
              >
                <Input
                  name="email"
                  type="email"
                  autoComplete="email"
                  onBlur={() => form.markTouched("email")}
                />
              </FormField>
            </div>
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
