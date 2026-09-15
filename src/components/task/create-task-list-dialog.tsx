"use client";

import { type ReactElement, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createFollowUpTaskAction } from "@/app/(beveiligd)/actions/task-actions";
import { FormStatus } from "@/components/form/form-status";
import { useFormSubmission } from "@/components/form/use-form-submission";
import { FollowUpFields } from "@/components/task/follow-up-fields";
import { Button } from "@/components/ui/button";
import { ComboboxMenu } from "@/components/ui/combobox";
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
import { SubmitStatusButton } from "@/components/ui/submit-status-button";
import { refreshAfterSuccess } from "@/lib/form-submission";
import { safeParseCreateFollowUpForm } from "@/lib/task-validation";

export type CreateTaskDealOption = {
  id: string;
  title: string;
  hint: string | null;
};

export function CreateTaskListDialog({
  deals,
  trigger,
}: {
  deals: CreateTaskDealOption[];
  trigger?: ReactElement;
}) {
  const router = useRouter();
  const fieldId = useId();
  const form = useFormSubmission({
    pendingLabel: "Toevoegen…",
    successLabel: "Toegevoegd",
  });
  const [open, setOpen] = useState(false);
  const [dateOnly, setDateOnly] = useState(false);
  const [dealId, setDealId] = useState("");

  function onOpenChange(next: boolean) {
    form.handleOpenChange(next, (value) => {
      setOpen(value);
      if (!value) {
        setDateOnly(false);
        setDealId("");
      }
    });
  }

  async function onSubmit(formData: FormData) {
    await form.submit({
      formData,
      fieldOrder: ["dealId", "followUpTitle", "followUpDate", "followUpTime"],
      fieldElementId: (name) =>
        name === "dealId" ? `${fieldId}-dealId` : `${fieldId}-${name}`,
      validate: safeParseCreateFollowUpForm,
      save: async (data) => {
        const saved = await createFollowUpTaskAction(null, data);
        if (saved.error) {
          return { error: saved.error, fieldErrors: saved.fieldErrors };
        }
        return { result: { createdAt: saved.createdAt } };
      },
      onSuccess: () => {
        onOpenChange(false);
        refreshAfterSuccess(() => router.refresh());
      },
    });
  }

  const dealItems = [
    { value: "", label: "Kies een lead…" },
    ...deals.map((deal) => ({
      value: deal.id,
      label: deal.title,
      hint: deal.hint ?? undefined,
    })),
  ];

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button type="button" aria-label="Nieuwe taak">
              Nieuwe taak
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader dismissible={form.status !== "submitting"}>
          <DialogTitle>Nieuwe taak</DialogTitle>
          <p className="text-sm text-fg-muted">
            Voeg een vervolgactie toe en koppel die aan een lead.
          </p>
        </DialogHeader>
        <form
          key={form.submissionId}
          action={onSubmit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <input type="hidden" name="submissionId" value={form.submissionId} />
          <input type="hidden" name="dealId" value={dealId} />
          <DialogBody className="flex flex-col gap-3">
            <FormField
              id={`${fieldId}-dealId`}
              label="Lead"
              error={form.shownErrors.dealId}
            >
              <ComboboxMenu
                value={dealId}
                onValueChange={(next) => {
                  setDealId(next);
                  form.markTouched("dealId");
                }}
                items={dealItems}
                placeholder="Kies een lead…"
                searchPlaceholder="Zoek een lead…"
                emptyLabel="Geen open leads"
              />
            </FormField>
            <FollowUpFields
              idPrefix={`${fieldId}-`}
              dateRequired
              dateOnly={dateOnly}
              onDateOnlyChange={setDateOnly}
            />
            <FormStatus error={form.error} statusMessage={form.statusMessage} />
          </DialogBody>
          <DialogFooter>
            <SubmitStatusButton
              readyLabel="Taak toevoegen"
              pendingLabel="Toevoegen…"
              successLabel="Toegevoegd"
              status={form.status}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
