"use client";

import { useId, useState } from "react";
import { createCompanyInlineAction } from "@/app/(beveiligd)/actions/company-actions";
import type { CreatedCompanyOption } from "@/app/(beveiligd)/actions/company-actions";
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
import { CountrySelect } from "@/components/company/country-select";

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
    const result = await createCompanyInlineAction(formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.company) {
      onCreated(result.company);
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
          <DialogTitle>Nieuw bedrijf</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} key={open ? `${id}-open` : `${id}-closed`}>
          <DialogBody className="flex flex-col gap-3">
            <FormField id={`${id}-name`} label="Naam">
              <Input
                name="companyName"
                required
                autoComplete="organization"
                defaultValue={defaultName ?? ""}
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id={`${id}-phone`} label="Telefoon">
                <Input name="companyPhone" type="tel" autoComplete="tel" />
              </FormField>
              <FormField id={`${id}-email`} label="E-mailadres">
                <Input
                  name="companyEmail"
                  type="email"
                  autoComplete="email"
                />
              </FormField>
            </div>
            <FormField id={`${id}-country`} label="Land">
              <CountrySelect name="companyCountry" defaultValue="NL" />
            </FormField>
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
