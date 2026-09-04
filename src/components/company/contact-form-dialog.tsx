"use client";

import { useState } from "react";
import {
  createContactAction,
  updateContactAction,
} from "@/app/(beveiligd)/actions/contact-actions";
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
import { Textarea } from "@/components/ui/textarea";

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

function ContactFields({ contact }: { contact?: ContactFormValues }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="firstName" label="Voornaam">
          <Input name="firstName" required defaultValue={contact?.firstName ?? ""} />
        </FormField>
        <FormField id="lastName" label="Achternaam">
          <Input name="lastName" defaultValue={contact?.lastName ?? ""} />
        </FormField>
      </div>
      <FormField id="jobTitle" label="Functie">
        <Input name="jobTitle" defaultValue={contact?.jobTitle ?? ""} />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="email" label="E-mailadres">
          <Input name="email" type="email" defaultValue={contact?.email ?? ""} />
        </FormField>
        <FormField id="phone" label="Telefoon">
          <Input name="phone" type="tel" defaultValue={contact?.phone ?? ""} />
        </FormField>
      </div>
      <FormField id="notes" label="Notities">
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
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createContactAction(null, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
  }

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="secondary" size="sm">
            Contact toevoegen
          </Button>
        }
      />
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Nieuw contact</DialogTitle>
        </DialogHeader>
        <form action={onSubmit}>
          <DialogBody>
            <input type="hidden" name="companyId" value={companyId} />
            <ContactFields />
            {error ? (
              <p className="mt-3 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="submit" loading={pending}>
              Opslaan
            </Button>
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
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await updateContactAction(null, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
  }

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm">
            Bewerken
          </Button>
        }
      />
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Contact bewerken</DialogTitle>
        </DialogHeader>
        <form action={onSubmit}>
          <DialogBody>
            <input type="hidden" name="id" value={contact.id} />
            <input type="hidden" name="companyId" value={companyId} />
            <ContactFields contact={contact} />
            {error ? (
              <p className="mt-3 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="submit" loading={pending}>
              Opslaan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
