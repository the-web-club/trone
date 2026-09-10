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
  open: openProp,
  onOpenChange,
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
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, null);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const isMenu = presentation === "menu";
  const showTrigger = presentation !== "hidden";

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
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
