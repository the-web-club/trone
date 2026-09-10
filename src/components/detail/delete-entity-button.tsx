"use client";

import { useActionState, useState } from "react";
import { detailMenuButtonClassName } from "@/components/detail/detail-action-menu";
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

export function DeleteEntityButton({
  id,
  action,
  title,
  description,
  label = "Verwijderen",
  presentation = "button",
}: {
  id: string;
  action: (
    prev: { error?: string } | null,
    formData: FormData,
  ) => Promise<{ error?: string }>;
  title: string;
  description: string;
  label?: string;
  presentation?: "button" | "menu";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, null);
  const isMenu = presentation === "menu";

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
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
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="id" value={id} />
          <DialogBody>
            <p className="text-sm text-fg-muted">{description}</p>
            {state?.error ? (
              <p className="mt-3 text-sm text-danger" role="alert">
                {state.error}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Annuleren
            </Button>
            <Button type="submit" variant="destructive" loading={pending}>
              Verwijderen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
