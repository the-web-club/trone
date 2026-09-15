"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { updateFollowUpTaskAction } from "@/app/(beveiligd)/actions/task-actions";
import { FormStatus } from "@/components/form/form-status";
import { useFormSubmission } from "@/components/form/use-form-submission";
import { type CreateTaskDealOption } from "@/components/task/create-task-list-dialog";
import { FollowUpFields } from "@/components/task/follow-up-fields";
import { ComboboxMenu } from "@/components/ui/combobox";
import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { SubmitStatusButton } from "@/components/ui/submit-status-button";
import { refreshAfterSuccess } from "@/lib/form-submission";
import {
  dealsIncludingCurrent,
  followUpDefaultsFromTask,
  safeParseCreateFollowUpForm,
  type TaskEditFormValues,
} from "@/lib/task-validation";

export function EditTaskListDialog({
  task,
  deals,
  open,
  onOpenChange,
}: {
  task: TaskEditFormValues;
  deals: CreateTaskDealOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const fieldId = useId();
  const form = useFormSubmission({
    pendingLabel: "Opslaan…",
    successLabel: "Opgeslagen",
  });
  const defaults = followUpDefaultsFromTask(task);
  const [dateOnly, setDateOnly] = useState(defaults.dateOnly);
  const [dealId, setDealId] = useState(task.dealId ?? "");

  function setOpen(next: boolean) {
    form.handleOpenChange(next, (value) => {
      onOpenChange(value);
      if (value) {
        setDateOnly(defaults.dateOnly);
        setDealId(task.dealId ?? "");
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
        const saved = await updateFollowUpTaskAction(null, data);
        if (saved.error) {
          return { error: saved.error, fieldErrors: saved.fieldErrors };
        }
        return { result: { savedAt: saved.savedAt } };
      },
      onSuccess: () => {
        setOpen(false);
        refreshAfterSuccess(() => router.refresh());
      },
    });
  }

  const dealItems = [
    { value: "", label: "Kies een lead…" },
    ...dealsIncludingCurrent(
      deals,
      task.dealId && task.dealTitle
        ? { id: task.dealId, title: task.dealTitle }
        : null,
    ).map((deal) => ({
      value: deal.id,
      label: deal.title,
      hint: deal.hint ?? undefined,
    })),
  ];

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader dismissible={form.status !== "submitting"}>
          <DialogTitle>Taak bewerken</DialogTitle>
          <p className="text-sm text-fg-muted">
            Pas de vervolgactie aan en koppel die aan een lead.
          </p>
        </DialogHeader>
        <form
          key={open ? `${task.id}-${form.submissionId}` : `${task.id}-closed`}
          action={onSubmit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="dealId" value={dealId} />
          {task.contactId ? (
            <input type="hidden" name="contactId" value={task.contactId} />
          ) : null}
          {task.companyId ? (
            <input type="hidden" name="companyId" value={task.companyId} />
          ) : null}
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
              initialKind={defaults.kind}
              initialTitle={defaults.title}
              initialDate={defaults.date}
              initialTime={defaults.time}
            />
            <FormStatus error={form.error} statusMessage={form.statusMessage} />
          </DialogBody>
          <DialogFooter>
            <SubmitStatusButton
              readyLabel="Opslaan"
              status={form.status}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
