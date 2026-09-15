"use client";

import { type ReactElement, useState } from "react";
import { useRouter } from "next/navigation";
import { createCompanyAction } from "@/app/(beveiligd)/actions/company-actions";
import { CompanyForm } from "@/components/company/company-form";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { refreshAfterSuccess } from "@/lib/form-submission";

export function CreateCompanyListDialog({
  trigger,
}: {
  trigger?: ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => {
        if (!next && busy) return;
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button type="button" aria-label="Nieuw bedrijf">
              Nieuw bedrijf
            </Button>
          )
        }
      />
      <DialogContent size="lg">
        <DialogHeader dismissible={!busy}>
          <DialogTitle>Nieuw bedrijf</DialogTitle>
          <p className="text-sm text-fg-muted">
            Voeg een klant of prospect toe.
          </p>
        </DialogHeader>
        <CompanyForm
          action={createCompanyAction}
          submitLabel="Bedrijf opslaan"
          onBusyChange={setBusy}
          onCreated={() => {
            setOpen(false);
            refreshAfterSuccess(() => router.refresh());
          }}
        />
      </DialogContent>
    </DialogRoot>
  );
}
