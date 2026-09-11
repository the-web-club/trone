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

export function CreateCompanyListDialog({
  trigger,
}: {
  trigger?: ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
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
        <DialogHeader>
          <DialogTitle>Nieuw bedrijf</DialogTitle>
          <p className="text-sm text-fg-muted">
            Voeg een klant of prospect toe.
          </p>
        </DialogHeader>
        <CompanyForm
          key={open ? "open" : "closed"}
          action={createCompanyAction}
          submitLabel="Bedrijf opslaan"
          onCreated={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </DialogRoot>
  );
}
