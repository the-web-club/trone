"use client";

import { type ReactElement, useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createFollowUpTaskAction } from "@/app/(beveiligd)/actions/task-actions";
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
  const [open, setOpen] = useState(false);
  const [dateOnly, setDateOnly] = useState(false);
  const [dealId, setDealId] = useState("");
  const [state, formAction, pending] = useActionState(
    createFollowUpTaskAction,
    null,
  );
  const notifiedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!state?.createdAt || notifiedAt.current === state.createdAt) return;
    notifiedAt.current = state.createdAt;
    setOpen(false);
    setDateOnly(false);
    setDealId("");
    router.refresh();
  }, [state?.createdAt, router]);

  const dealItems = [
    { value: "", label: "Kies een lead…" },
    ...deals.map((deal) => ({
      value: deal.id,
      label: deal.title,
      hint: deal.hint ?? undefined,
    })),
  ];

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setDateOnly(false);
          setDealId("");
        }
      }}
    >
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
        <DialogHeader>
          <DialogTitle>Nieuwe taak</DialogTitle>
          <p className="text-sm text-fg-muted">
            Voeg een vervolgactie toe en koppel die aan een lead.
          </p>
        </DialogHeader>
        <form
          key={open ? "open" : "closed"}
          action={formAction}
          className="flex min-h-0 flex-1 flex-col"
        >
          <input type="hidden" name="dealId" value={dealId} />
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
            />
            {state?.error ? (
              <p className="text-sm text-danger" role="alert">
                {state.error}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="submit" loading={pending} disabled={!dealId}>
              Taak toevoegen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
