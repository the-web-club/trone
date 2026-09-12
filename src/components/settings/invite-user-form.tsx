"use client";

import { useState } from "react";
import { inviteUserAction } from "@/app/(beveiligd)/actions/user-actions";
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
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select";
import { userRoleLabels, userRoles } from "@/lib/user-validation";

export function InviteUserForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await inviteUserAction(null, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
  }

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="primary" aria-label="Teamlid toevoegen">
            Teamlid toevoegen
          </Button>
        }
      />
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Teamlid uitnodigen</DialogTitle>
        </DialogHeader>
        <form action={onSubmit}>
          <DialogBody>
            <div className="flex flex-col gap-3">
              <FormField id="name" label="Naam">
                <Input name="name" required autoComplete="name" />
              </FormField>
              <FormField id="email" label="E-mailadres">
                <Input name="email" type="email" required autoComplete="email" />
              </FormField>
              <FormField id="role" label="Rol">
                <SelectMenu
                  name="role"
                  defaultValue="user"
                  searchPlaceholder="Zoek een rol…"
                  items={userRoles.map((role) => ({
                    value: role,
                    label: userRoleLabels[role],
                  }))}
                />
              </FormField>
              {error ? (
                <p className="text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="submit" loading={pending}>
              Uitnodigen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
