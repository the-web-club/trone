"use client";

import { useId, useState } from "react";
import {
  createContactAction,
  updateContactAction,
} from "@/app/(beveiligd)/actions/contact-actions";
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
import { Textarea } from "@/components/ui/textarea";
import { safeParseContactForm } from "@/lib/contact-validation";

export type ContactFormValues = {
  id: string;
  firstName: string;
  lastName?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  isPrimary: boolean;
};

function ContactFields({
  id,
  contact,
  errors,
  onBlurField,
}: {
  id: string;
  contact?: ContactFormValues;
  errors: Record<string, string>;
  onBlurField: (name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField id={`${id}-firstName`} label="Voornaam" error={errors.firstName}>
          <Input
            name="firstName"
            defaultValue={contact?.firstName ?? ""}
            onBlur={() => onBlurField("firstName")}
          />
        </FormField>
        <FormField id={`${id}-lastName`} label="Achternaam">
          <Input name="lastName" defaultValue={contact?.lastName ?? ""} />
        </FormField>
      </div>
      <FormField id={`${id}-jobTitle`} label="Functie">
        <Input name="jobTitle" defaultValue={contact?.jobTitle ?? ""} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField id={`${id}-email`} label="E-mailadres" error={errors.email}>
          <Input
            name="email"
            type="email"
            defaultValue={contact?.email ?? ""}
            onBlur={() => onBlurField("email")}
          />
        </FormField>
        <FormField id={`${id}-phone`} label="Telefoon">
          <Input name="phone" type="tel" defaultValue={contact?.phone ?? ""} />
        </FormField>
      </div>
      <FormField id={`${id}-notes`} label="Notities">
        <Textarea name="notes" defaultValue={contact?.notes ?? ""} />
      </FormField>
      <label className="flex items-center gap-2 text-sm text-fg">
        <input
          type="checkbox"
          name="isPrimary"
          defaultChecked={contact?.isPrimary ?? false}
          className="size-3.5 rounded-xs border-border accent-fg"
        />
        Primair contact
      </label>
    </div>
  );
}

export function CreateContactDialog({ companyId }: { companyId: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const form = useFormSubmission({
    pendingLabel: "Opslaan…",
    successLabel: "Opgeslagen",
  });

  async function onSubmit(formData: FormData) {
    await form.submit({
      formData,
      fieldOrder: ["firstName", "email"],
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
      onSuccess: () => form.handleOpenChange(false, setOpen),
    });
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => form.handleOpenChange(next, setOpen)}
    >
      <DialogTrigger
        render={
          <Button variant="secondary" size="sm">
            Contact toevoegen
          </Button>
        }
      />
      <DialogContent size="md">
        <DialogHeader dismissible={form.status !== "submitting"}>
          <DialogTitle>Nieuw contact</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} noValidate key={form.submissionId}>
          <DialogBody>
            <input type="hidden" name="submissionId" value={form.submissionId} />
            <input type="hidden" name="companyId" value={companyId} />
            <ContactFields
              id={id}
              errors={form.shownErrors}
              onBlurField={form.markTouched}
            />
            <div className="mt-3">
              <FormStatus error={form.error} statusMessage={form.statusMessage} />
            </div>
          </DialogBody>
          <DialogFooter>
            <SubmitStatusButton
              readyLabel="Opslaan"
              status={form.status}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}

export function EditContactDialog({
  companyId,
  contact,
}: {
  companyId: string;
  contact: ContactFormValues;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const form = useFormSubmission({
    pendingLabel: "Opslaan…",
    successLabel: "Opgeslagen",
  });

  async function onSubmit(formData: FormData) {
    await form.submit({
      formData,
      fieldOrder: ["firstName", "email"],
      fieldElementId: (name) => `${id}-${name}`,
      validate: safeParseContactForm,
      save: async (data) => {
        const saved = await updateContactAction(null, data);
        if (saved.error) {
          return { error: saved.error, fieldErrors: saved.fieldErrors };
        }
        return { result: true };
      },
      onSuccess: () => form.handleOpenChange(false, setOpen),
    });
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => form.handleOpenChange(next, setOpen)}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm">
            Bewerken
          </Button>
        }
      />
      <DialogContent size="md">
        <DialogHeader dismissible={form.status !== "submitting"}>
          <DialogTitle>Contact bewerken</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} noValidate key={form.submissionId}>
          <DialogBody>
            <input type="hidden" name="id" value={contact.id} />
            <input type="hidden" name="companyId" value={companyId} />
            <ContactFields
              id={id}
              contact={contact}
              errors={form.shownErrors}
              onBlurField={form.markTouched}
            />
            <div className="mt-3">
              <FormStatus error={form.error} statusMessage={form.statusMessage} />
            </div>
          </DialogBody>
          <DialogFooter>
            <SubmitStatusButton readyLabel="Opslaan" status={form.status} />
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
