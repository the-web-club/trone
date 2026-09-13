"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateFollowUpTaskAction } from "@/app/(beveiligd)/actions/task-actions";
import { type CreateTaskDealOption } from "@/components/task/create-task-list-dialog";
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
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import {
  dealsIncludingCurrent,
  followUpDefaultsFromTask,
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
  const defaults = followUpDefaultsFromTask(task);
  const [dateOnly, setDateOnly] = useState(defaults.dateOnly);
  const [dealId, setDealId] = useState(task.dealId ?? "");
  const [state, formAction, pending] = useActionState(
    updateFollowUpTaskAction,
    null,
  );
  const notifiedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setDateOnly(defaults.dateOnly);
    setDealId(task.dealId ?? "");
  }, [open, defaults.dateOnly, task.dealId]);

  useEffect(() => {
    if (!state?.savedAt || notifiedAt.current === state.savedAt) return;
    notifiedAt.current = state.savedAt;
    onOpenChange(false);
    router.refresh();
  }, [state?.savedAt, onOpenChange, router]);

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
  const canSubmit = Boolean(dealId || task.contactId || task.companyId);

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Taak bewerken</DialogTitle>
          <p className="text-sm text-fg-muted">
            Pas de vervolgactie aan en koppel die aan een lead.
          </p>
        </DialogHeader>
        <form
          key={open ? `${task.id}-open` : `${task.id}-closed`}
          action={formAction}
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
            <FormField id={`${fieldId}-dealId`} label="Lead">
              <ComboboxMenu
                value={dealId}
                onValueChange={setDealId}
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
            {state?.error ? (
              <p className="text-sm text-danger" role="alert">
                {state.error}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="submit" loading={pending} disabled={!canSubmit}>
              Opslaan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
