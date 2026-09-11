"use client";

import { useId, useState } from "react";
import { createContactAction } from "@/app/(beveiligd)/actions/contact-actions";
import type { ComposerCreatedContact } from "@/app/(beveiligd)/actions/composer-customer-actions";
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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const open = openProp ?? uncontrolledOpen;

  function setOpen(next: boolean) {
    if (openProp === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
    if (!next) setError(null);
  }

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createContactAction(null, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.contact) {
      onCreated(result.contact);
      setOpen(false);
    }
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
        <DialogHeader>
          <DialogTitle>Nieuw contact</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} key={open ? `${id}-open` : `${id}-closed`}>
          <input type="hidden" name="companyId" value={companyId} />
          {companyId ? (
            <input type="hidden" name="isPrimary" value="on" />
          ) : null}
          <DialogBody className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id={`${id}-firstName`} label="Voornaam">
                <Input
                  name="firstName"
                  required
                  autoComplete="given-name"
                  defaultValue={defaultFirstName ?? ""}
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
              <FormField id={`${id}-email`} label="E-mailadres">
                <Input name="email" type="email" autoComplete="email" />
              </FormField>
            </div>
            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="submit" loading={pending}>
              Toevoegen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
