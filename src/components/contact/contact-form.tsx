"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type ContactFormValues = {
  id: string;
  companyId: string;
  firstName: string;
  lastName?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  isPrimary: boolean;
};

export function ContactForm({
  contact,
  action,
  submitLabel,
}: {
  contact: ContactFormValues;
  action: (
    prev: { error?: string } | null,
    formData: FormData,
  ) => Promise<{ error?: string }>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-3">
      <input type="hidden" name="id" value={contact.id} />
      <input type="hidden" name="companyId" value={contact.companyId} />
      <div className="grid grid-cols-2 gap-3">
        <FormField id="firstName" label="Voornaam">
          <Input name="firstName" required defaultValue={contact.firstName} />
        </FormField>
        <FormField id="lastName" label="Achternaam">
          <Input name="lastName" defaultValue={contact.lastName ?? ""} />
        </FormField>
      </div>
      <FormField id="jobTitle" label="Functie">
        <Input name="jobTitle" defaultValue={contact.jobTitle ?? ""} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField id="email" label="E-mailadres">
          <Input name="email" type="email" defaultValue={contact.email ?? ""} />
        </FormField>
        <FormField id="phone" label="Telefoon">
          <Input name="phone" type="tel" defaultValue={contact.phone ?? ""} />
        </FormField>
      </div>
      <FormField id="notes" label="Notities">
        <Textarea name="notes" defaultValue={contact.notes ?? ""} />
      </FormField>
      <label className="flex items-center gap-2 text-sm text-fg">
        <input
          type="checkbox"
          name="isPrimary"
          defaultChecked={contact.isPrimary}
          className="size-3.5 rounded-xs border-border accent-fg"
        />
        Primair contact
      </label>
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
