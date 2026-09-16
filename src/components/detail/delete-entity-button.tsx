"use client";

import { useState } from "react";
import { detailMenuButtonClassName } from "@/components/detail/detail-action-menu";
import { FormStatus } from "@/components/form/form-status";
import { useFormSubmission } from "@/components/form/use-form-submission";
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
import { SubmitStatusButton } from "@/components/ui/submit-status-button";

export function DeleteEntityButton({
  id,
  action,
  title,
  description,
  label = "Verwijderen",
  presentation = "button",
  open: openProp,
  onOpenChange,
  onDeleted,
}: {
  id: string;
  action: (
    prev: { error?: string } | null,
    formData: FormData,
  ) => Promise<{ error?: string }>;
  title: string;
  description: string;
  label?: string;
  presentation?: "button" | "menu" | "hidden";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const form = useFormSubmission({
    pendingLabel: "Verwijderen…",
    successLabel: "Verwijderd",
  });
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const isMenu = presentation === "menu";
  const showTrigger = presentation !== "hidden";

  async function onSubmit(formData: FormData) {
    await form.submit({
      formData,
      validate: () => ({ success: true }),
      save: async (data) => {
        const saved = await action(null, data);
        if (saved.error) return { error: saved.error };
        return { result: true };
      },
      onSuccess: () => {
        form.handleOpenChange(false, setOpen);
        onDeleted?.();
      },
    });
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => form.handleOpenChange(next, setOpen)}
    >
      {showTrigger ? (
        <DialogTrigger
          render={
            <Button
              type="button"
              variant={isMenu ? "ghost" : "secondary"}
              className={isMenu ? detailMenuButtonClassName(true) : undefined}
            />
          }
        >
          {label}
        </DialogTrigger>
      ) : null}
      <DialogContent size="sm">
        <DialogHeader dismissible={form.status !== "submitting"}>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} noValidate>
          <input type="hidden" name="id" value={id} />
          <DialogBody>
            <p className="text-sm text-fg-muted">{description}</p>
            <div className="mt-3">
              <FormStatus error={form.error} statusMessage={form.statusMessage} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={form.status === "submitting"}
              onClick={() => form.handleOpenChange(false, setOpen)}
            >
              Annuleren
            </Button>
            <SubmitStatusButton
              variant="destructive"
              readyLabel="Verwijderen"
              pendingLabel="Verwijderen…"
              successLabel="Verwijderd"
              status={form.status}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
