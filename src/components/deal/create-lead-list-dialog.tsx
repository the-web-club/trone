"use client";

import { type ReactElement, useState } from "react";
import { useRouter } from "next/navigation";
import { createDealAction } from "@/app/(beveiligd)/actions/deal-actions";
import { refreshAfterSuccess } from "@/lib/lead-submission";
import {
  DealForm,
  type DealFormContact,
  type DealFormOption,
} from "@/components/deal/deal-form";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CreateLeadListDialog({
  stages,
  sources,
  companies,
  contacts,
  trigger,
}: {
  stages: DealFormOption[];
  sources: DealFormOption[];
  companies: DealFormOption[];
  contacts: DealFormContact[];
  trigger?: ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nestedOpen, setNestedOpen] = useState(false);
  const [formEpoch, setFormEpoch] = useState(0);

  function onOpenChange(next: boolean) {
    if (!next && nestedOpen) return;
    setOpen(next);
    if (!next) setNestedOpen(false);
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button type="button" aria-label="Nieuwe lead">
              Nieuwe lead
            </Button>
          )
        }
      />
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Nieuwe lead</DialogTitle>
          <p className="text-sm text-fg-muted">
            Voeg een lead toe aan de pijplijn.
          </p>
        </DialogHeader>
        <DealForm
          key={formEpoch}
          action={createDealAction}
          submitLabel="Lead opslaan"
          stages={stages}
          sources={sources}
          companies={companies}
          contacts={contacts}
          onNestedOpenChange={setNestedOpen}
          onCreated={() => {
            setFormEpoch((value) => value + 1);
            onOpenChange(false);
            refreshAfterSuccess(() => router.refresh());
          }}
        />
      </DialogContent>
    </DialogRoot>
  );
}
