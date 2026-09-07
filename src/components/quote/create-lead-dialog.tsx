"use client";

import { useId, useState } from "react";
import { createDealInlineAction } from "@/app/(beveiligd)/actions/deal-actions";
import type { CreatedDealOption } from "@/app/(beveiligd)/actions/deal-actions";
import { Button } from "@/components/ui/button";
import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export function CreateLeadDialog({
  companyId,
  contactId,
  defaultTitle,
  open,
  onOpenChange,
  onCreated,
}: {
  companyId: string;
  contactId?: string;
  defaultTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (deal: CreatedDealOption) => void;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const disabled = !companyId;

  async function onSubmit(formData: FormData) {
    if (disabled) return;
    setPending(true);
    setError(null);
    const result = await createDealInlineAction(formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.deal) {
      onCreated(result.deal);
      onOpenChange(false);
    }
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => {
        if (disabled && next) return;
        onOpenChange(next);
        if (!next) setError(null);
      }}
    >
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Nieuwe lead</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} key={open ? `${id}-open` : `${id}-closed`}>
          <input type="hidden" name="companyId" value={companyId} />
          {contactId ? (
            <input type="hidden" name="contactId" value={contactId} />
          ) : null}
          <DialogBody className="flex flex-col gap-3">
            <FormField id={`${id}-title`} label="Titel">
              <Input name="title" required defaultValue={defaultTitle ?? ""} />
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
