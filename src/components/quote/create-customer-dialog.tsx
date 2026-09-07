"use client";

import { useId, useState } from "react";
import { createComposerCustomerAction } from "@/app/(beveiligd)/actions/composer-customer-actions";
import type {
  ComposerCreatedCompany,
  ComposerCreatedContact,
  ComposerCreatedDeal,
} from "@/app/(beveiligd)/actions/composer-customer-actions";
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
    const result = await createComposerCustomerAction(formData);
    setPending(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("company" in result) {
      onCreated(result);
      setOpen(false);
    }
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
        <DialogHeader>
          <DialogTitle>Nieuwe klant</DialogTitle>
          <p className="text-sm text-fg-muted">
            Voor een telefonische intake. Contact en lead zijn optioneel.
          </p>
        </DialogHeader>
        <form action={onSubmit} key={open ? `${id}-open` : `${id}-closed`}>
          <DialogBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <p className="text-label font-medium tracking-wide text-fg-muted uppercase">
                Bedrijf
              </p>
              <FormField id={`${id}-companyName`} label="Naam">
                <Input
                  name="companyName"
                  required
                  autoComplete="organization"
                  defaultValue={defaultName ?? ""}
                />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id={`${id}-companyPhone`} label="Telefoon">
                  <Input name="companyPhone" type="tel" autoComplete="tel" />
                </FormField>
                <FormField id={`${id}-companyEmail`} label="E-mailadres">
                  <Input
                    name="companyEmail"
                    type="email"
                    autoComplete="email"
                  />
                </FormField>
              </div>
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
